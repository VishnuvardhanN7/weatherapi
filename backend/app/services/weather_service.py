import logging
from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weather_event import (
    WeatherEvent, EventType, SeverityLevel,
    EventSource, VerificationStatus
)
from app.ml.categorizer import Categorizer
from app.ml.fake_detector import FakeDetector
from app.ml.deduplicator import Deduplicator
from app.ml.classifier_engine import classifier_engine
from app.ml.severity_engine import severity_engine
from app.services.notification_service import notify_affected_citizens
from app.services.intelligence_service import intelligence_service

logger = logging.getLogger(__name__)


class WeatherService:
    def __init__(self):
        self.categorizer = Categorizer()
        self.fake_detector = FakeDetector()
        self.deduplicator = Deduplicator()

    async def ingest_event(
        self,
        db: AsyncSession,
        title: str,
        description: str,
        source: EventSource,
        source_url: Optional[str] = None,
        source_id: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        photos: Optional[List[str]] = None,
        videos: Optional[List[str]] = None,
        metadata: Optional[dict] = None,
        reported_by_id: Optional[int] = None,
        reported_at: Optional[datetime] = None,
    ) -> WeatherEvent:
        category_label, confidence = self.categorizer.categorize(title, description)
        event_type = category_label or EventType.OTHER

        classification_result = classifier_engine.classify(title, description)
        if classification_result.category and classification_result.confidence >= confidence:
            event_type = classification_result.category
            confidence = classification_result.confidence

        is_fake, fake_confidence = self.fake_detector.predict(title, description)

        severity = self._determine_severity(title, description, event_type)
        severity_result = severity_engine.determine(title, description, event_type, city or "")
        if severity_result[1] >= 0.8:
            try:
                severity = SeverityLevel(severity_result[0].lower())
            except ValueError:
                pass
        if isinstance(severity, str):
            try:
                severity = SeverityLevel(severity.lower())
            except ValueError:
                pass

        event = WeatherEvent(
            title=title,
            description=description,
            event_type=event_type,
            severity=severity,
            source=source,
            source_url=source_url,
            source_id=source_id,
            city=city,
            state=state,
            latitude=latitude,
            longitude=longitude,
            photos=photos or [],
            videos=videos or [],
            metadata_=metadata or {},
            verification_status=VerificationStatus.PENDING,
            is_fake=is_fake,
            fake_confidence=float(fake_confidence),
            category_confidence=float(confidence),
            reported_by_id=reported_by_id,
            reported_at=reported_at or datetime.utcnow(),
        )

        duplicate = await self.deduplicator.find_duplicate(db, event)
        if duplicate:
            event.duplicate_of_id = duplicate.id

        db.add(event)
        await db.commit()
        await db.refresh(event)
        event_id = event.id

        try:
            await intelligence_service.process_event(db, event)
            if event.verification_status == VerificationStatus.PENDING:
                intelligence = (event.metadata_ or {}).get("intelligence", {}) if isinstance(event.metadata_, dict) else {}
                v = intelligence.get("verification", {})
                status_map = {
                    "VERIFIED": VerificationStatus.VERIFIED,
                    "REJECTED": VerificationStatus.REJECTED,
                    "NEEDS_REVIEW": VerificationStatus.NEEDS_REVIEW,
                    "PROBABLE": VerificationStatus.VERIFIED if event.source == EventSource.API else VerificationStatus.PENDING,
                    "UNVERIFIED": VerificationStatus.PENDING,
                }
                auto = status_map.get(v.get("status"))
                if auto:
                    event.verification_status = auto
                elif event.source == EventSource.API:
                    event.verification_status = VerificationStatus.VERIFIED
            await db.commit()
            await db.refresh(event)
        except Exception as exc:
            logger.warning("Intelligence pipeline failed for event %s: %s", event_id, exc)
            await db.rollback()

        try:
            await notify_affected_citizens(db, event)
        except Exception as exc:
            logger.warning("Location-based notification failed for event %s: %s", event_id, exc)

        return event

    def _determine_severity(self, title: str, description: str, event_type: EventType) -> SeverityLevel:
        text = f"{title} {description}".lower()

        critical_keywords = [
            "severe", "extreme", "catastrophic", "disaster", "massive",
            "emergency", "evacuation", "devastating", "worst", "historic",
            "death", "kill", "destroy", "submerge", "catastrophic"
        ]
        high_keywords = [
            "heavy", "intense", "flooding", "cyclone", "storm surge",
            "landfall", "major", "significant", "warning", "red alert",
            "dangerous", "threatening", "severe"
        ]
        moderate_keywords = [
            "moderate", "warning", "advisory", "watch", "affected",
            "damage", "disrupt", "impact", "heavy rain", "strong wind"
        ]

        if any(kw in text for kw in critical_keywords):
            return SeverityLevel.CRITICAL
        if any(kw in text for kw in high_keywords):
            return SeverityLevel.HIGH
        if any(kw in text for kw in moderate_keywords):
            return SeverityLevel.MODERATE
        return SeverityLevel.LOW

    async def get_event_stats(self, db: AsyncSession) -> dict:
        total = (await db.execute(select(func.count()).select_from(WeatherEvent))).scalar() or 0
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = (await db.execute(
            select(func.count()).select_from(WeatherEvent).where(WeatherEvent.reported_at >= today)
        )).scalar() or 0
        verified = (await db.execute(
            select(func.count()).select_from(WeatherEvent).where(
                WeatherEvent.verification_status == VerificationStatus.VERIFIED
            )
        )).scalar() or 0
        pending = (await db.execute(
            select(func.count()).select_from(WeatherEvent).where(
                WeatherEvent.verification_status == VerificationStatus.PENDING
            )
        )).scalar() or 0
        fake = (await db.execute(
            select(func.count()).select_from(WeatherEvent).where(WeatherEvent.is_fake == True)
        )).scalar() or 0

        return {
            "total_events": total,
            "today_events": today_count,
            "verified_events": verified,
            "pending_review": pending,
            "detected_fake": fake,
            "verification_rate": (verified / total * 100) if total > 0 else 0,
        }


weather_service = WeatherService()