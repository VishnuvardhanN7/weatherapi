import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    Enum, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class EventType(str, enum.Enum):
    RAINFALL = "rainfall"
    THUNDERSTORM = "thunderstorm"
    FLOODING = "flooding"
    HEATWAVE = "heatwave"
    FOG = "fog"
    DUST_STORM = "dust_storm"
    STRONG_WINDS = "strong_winds"
    CYCLONE = "cyclone"
    OTHER = "other"


class SeverityLevel(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class EventSource(str, enum.Enum):
    TWITTER = "twitter"
    WEB = "web"
    API = "api"
    CITIZEN_REPORT = "citizen_report"
    OTHER = "other"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class WeatherEvent(Base):
    __tablename__ = "weather_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=False)

    event_type = Column(Enum(EventType, native_enum=False, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    severity = Column(Enum(SeverityLevel, native_enum=False, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    source = Column(Enum(EventSource, native_enum=False, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    source_url = Column(String(2000), nullable=True)
    source_id = Column(String(500), nullable=True, index=True)

    city = Column(String(200), nullable=True, index=True)
    state = Column(String(200), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    photos = Column(JSON, default=list)
    videos = Column(JSON, default=list)
    metadata_ = Column("metadata", JSON, default=dict)

    verification_status = Column(Enum(VerificationStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]), nullable=False, default=VerificationStatus.PENDING, index=True)
    is_fake = Column(Boolean, default=False, index=True)
    fake_confidence = Column(Float, default=0.0)
    category_confidence = Column(Float, default=0.0)

    # SIH intelligence columns (populated by the intelligence pipeline)
    incident_id = Column(Integer, nullable=True, index=True)
    verification_score = Column(Float, nullable=True, default=0.0)
    priority_score = Column(Float, nullable=True, default=0.0)
    source_trust_score = Column(Float, nullable=True, default=0.0)
    data_quality_score = Column(Float, nullable=True, default=0.0)
    lifecycle = Column(String(50), nullable=True, index=True)

    duplicate_of_id = Column(Integer, ForeignKey("weather_events.id"), nullable=True)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    reported_by = relationship("User", foreign_keys=[reported_by_id], back_populates="reported_events")
    verified_by = relationship("User", foreign_keys=[verified_by_id], back_populates="verified_events")
    duplicate_of = relationship("WeatherEvent", remote_side=[id], backref="duplicates")

    __table_args__ = (
        Index("ix_weather_events_location", "latitude", "longitude"),
        Index("ix_weather_events_type_severity", "event_type", "severity"),
        Index("ix_weather_events_state_type", "state", "event_type"),
    )

    def _source_details(self) -> dict:
        """Human-readable provenance info derived from metadata.

        Always returns a flat, serialisable dict. Social posts expose the
        author handle and profile so analysts can verify before deciding.
        """
        metadata = self.metadata_ or {}
        details = {
            "display": self.source.value if self.source else None,
            "url": self.source_url,
            "id": self.source_id,
        }

        if self.source == EventSource.TWITTER:
            details.update({
                "platform": "X / Twitter",
                "author_name": metadata.get("author_name"),
                "handle": metadata.get("screen_name"),
                "followers": metadata.get("author_followers"),
                "verified": metadata.get("author_verified", False),
                "author_location": metadata.get("author_location"),
                "created_via": metadata.get("collector"),
                "engagement": {
                    "favorites": metadata.get("favorites", 0),
                    "retweets": metadata.get("retweets", 0),
                    "replies": metadata.get("replies", 0),
                    "views": metadata.get("views", 0),
                },
                "hashtags": metadata.get("hashtags", []),
            })
        elif self.source == EventSource.WEB:
            details.update({
                "platform": "Web / News",
                "search_query": metadata.get("search_query"),
            })
        elif self.source == EventSource.API:
            details.update({
                "platform": "Public API (OpenWeather)",
                "provider": metadata.get("provider") or metadata.get("source"),
            })
        elif self.source == EventSource.CITIZEN_REPORT:
            details.update({
                "platform": "Citizen report",
                "report_kind": "sample" if metadata.get("citizen_report") else "live",
            })
        return details

    def to_dict(self, reported_by_name: Optional[str] = None, verified_by_name: Optional[str] = None):
        metadata = self.metadata_ or {}
        intelligence = metadata.get("intelligence") if isinstance(metadata, dict) else None
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "event_type": self.event_type.value if self.event_type else None,
            "severity": self.severity.value if self.severity else None,
            "source": self.source.value if self.source else None,
            "source_url": self.source_url,
            "source_id": self.source_id,
            "city": self.city,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "photos": self.photos or [],
            "videos": self.videos or [],
            "metadata": metadata,
            "intelligence": intelligence,
            "verification_status": self.verification_status.value if self.verification_status else None,
            "is_fake": self.is_fake,
            "fake_confidence": self.fake_confidence,
            "category_confidence": self.category_confidence,
            "incident_id": self.incident_id,
            "verification_score": self.verification_score,
            "priority_score": self.priority_score,
            "source_trust_score": self.source_trust_score,
            "data_quality_score": self.data_quality_score,
            "lifecycle": self.lifecycle,
            "duplicate_of_id": self.duplicate_of_id,
            "reported_by_id": self.reported_by_id,
            "verified_by_id": self.verified_by_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "reported_at": self.reported_at.isoformat() if self.reported_at else None,
            "source_details": self._source_details(),
            "reported_by_name": reported_by_name,
            "verified_by_name": verified_by_name,
            "media": self._media_metadata(),
        }

    def _media_metadata(self) -> list:
        """Public metadata for DB-backed media referenced by photos/videos.

        Media entries are stored as ``media:<id>`` identifiers. Existing
        filesystem paths (legacy uploads) are passed through unchanged so
        old events remain compatible.
        """
        result = []
        for entry in (self.photos or []) + (self.videos or []):
            if isinstance(entry, str) and entry.startswith("media:"):
                try:
                    media_id = int(entry.split(":", 1)[1])
                except (ValueError, IndexError):
                    continue
                result.append({
                    "id": media_id,
                    "kind": "image"
                    if entry in (self.photos or [])
                    else "video",
                    "url": f"/api/media/{media_id}/content",
                })
            elif isinstance(entry, str):
                result.append({
                    "id": None,
                    "kind": "image" if entry in (self.photos or []) else "video",
                    "url": entry,
                })
        return result
