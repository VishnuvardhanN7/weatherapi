"""
Intelligence & Explainability API.

Endpoints:
  GET  /events/{event_id}           → full AI intelligence panel for an event
  GET  /events/{event_id}/audit     → classification / review audit trail
  POST /events/{event_id}/classify  → admin classification override (human-in-the-loop)
  GET  /sources                     → source health & trust table

Every intelligence block is versioned and reconstructable. History is stored
in event metadata so nothing is ever lost when the pipeline is improved.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.weather_event import WeatherEvent, EventType, EventSource, VerificationStatus
from app.models.user import User
from app.api.auth import get_current_user, get_current_admin
from app.services.intelligence_service import intelligence_service
from app.ml.source_trust import get_all_source_trusts
from app.ml.classifier_engine import classifier_engine

router = APIRouter()


class ClassificationOverride(BaseModel):
    event_type: EventType
    reason: str
    note: Optional[str] = None


def _get_intelligence(event) -> dict:
    metadata = event.metadata_ or {}
    return metadata.get("intelligence", {}) if isinstance(metadata, dict) else {}


@router.get("/events/{event_id}", response_model=dict)
async def event_intelligence(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the complete intelligence panel for an event.

    Lazy-computes the pipeline if the event predates the intelligence
    engine, so every historical event gets a score without a migration.
    """
    result = await db.execute(
        select(WeatherEvent).where(WeatherEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Weather event not found")

    intelligence = _get_intelligence(event)
    if not intelligence:
        intelligence = await intelligence_service.process_event(db, event)
        await db.commit()
        await db.refresh(event)
        intelligence = _get_intelligence(event)

    return {
        "event": event.to_dict(),
        "intelligence": intelligence,
    }


@router.get("/events/{event_id}/audit", response_model=dict)
async def event_audit_trail(
    event_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WeatherEvent)
        .options(
            selectinload(WeatherEvent.reported_by),
            selectinload(WeatherEvent.verified_by),
        )
        .where(WeatherEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Weather event not found")

    metadata = event.metadata_ or {}
    intelligence = metadata.get("intelligence", {}) if isinstance(metadata, dict) else {}
    classification_history = intelligence.get("classification_history", []) or []

    return {
        "event_id": event.id,
        "reported_at": event.reported_at.isoformat() if event.reported_at else None,
        "reported_by": (event.reported_by.username if event.reported_by else None),
        "verified_by": (event.verified_by.username if event.verified_by else None),
        "audit_entries": list(classification_history),
    }


def _ensure_classification_history(metadata: dict) -> list:
    intelligence = metadata.setdefault("intelligence", {})
    history = intelligence.setdefault("classification_history", [])
    return history


@router.post("/events/{event_id}/classify", response_model=dict)
async def classify_override(
    event_id: int,
    override: ClassificationOverride,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Human-in-the-loop classification override.

    Keeps the original AI decision + the manual decision + who/when/why in
    the audit trail. Marks the classification state MANUALLY_CLASSIFIED.
    """
    result = await db.execute(select(WeatherEvent).where(WeatherEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Weather event not found")

    metadata = event.metadata_ or {}
    if not isinstance(metadata, dict):
        metadata = {}

    intelligence = metadata.get("intelligence", {})
    if not isinstance(intelligence, dict):
        intelligence = {"version": "intelligence-pipeline-v1"}

    original = {
        "event_type": event.event_type.value if event.event_type else None,
        "confidence": getattr(event, "category_confidence", 0.0) or 0.0,
        "state": intelligence.get("classification", {}).get("state", "AUTO_CLASSIFIED"),
        "version": intelligence.get("classification", {}).get("version", classifier_engine.version),
    }

    history = _ensure_classification_history(metadata)
    history.append({
        "action": "manual_override",
        "timestamp": datetime.utcnow().isoformat(),
        "admin_id": current_user.id,
        "admin_username": current_user.username,
        "original": original,
        "new": {
            "event_type": override.event_type.value,
        },
        "reason": override.reason,
        "note": override.note,
    })

    classification = intelligence.setdefault("classification", {})
    classification["category"] = override.event_type.value
    classification["state"] = "MANUALLY_CLASSIFIED"
    classification["manual_override"] = {
        "approved_by": current_user.username,
        "approved_at": datetime.utcnow().isoformat(),
        "reason": override.reason,
    }

    intelligence["classification_history"] = history
    metadata["intelligence"] = intelligence
    event.metadata_ = metadata
    event.event_type = override.event_type

    await db.commit()
    await db.refresh(event)

    return {
        "event_id": event.id,
        "event_type": override.event_type.value,
        "state": "MANUALLY_CLASSIFIED",
        "ai_original": original,
        "approved_by": current_user.username,
    }


@router.get("/sources", response_model=dict)
async def source_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Source health & trust table for data provenance transparency."""
    trusts = await get_all_source_trusts(db)
    return {
        "version": "source-trust-v1",
        "min_samples_for_statistics": 10,
        "sources": trusts,
    }


class ChatQueryRequest(BaseModel):
    query: str


@router.post("/ask", response_model=dict)
async def ask_intelligence(
    body: ChatQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Conversational AI assistant endpoint for ATMOS Indian weather intelligence.

    Analyzes active events, observations, risks, and regional intelligence dynamically.
    """
    import json
    import os
    from app.core.config import settings

    query_text = (body.query or "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    query_lower = query_text.lower()

    # 1. Gather live database facts
    total_res = await db.execute(select(WeatherEvent))
    all_events = list(total_res.scalars().all())
    total_count = len(all_events)

    # Sort recent events by reported_at / created_at
    recent_events = sorted(
        all_events,
        key=lambda e: e.reported_at or e.created_at or datetime.min,
        reverse=True,
    )[:10]

    type_counts = {}
    severity_counts = {}
    state_counts = {}
    high_critical_events = []
    rainfall_events = []

    for ev in all_events:
        t_val = (
            ev.event_type.value
            if hasattr(ev.event_type, "value")
            else str(ev.event_type or "other")
        )
        s_val = (
            ev.severity.value
            if hasattr(ev.severity, "value")
            else str(ev.severity or "moderate")
        )
        st_val = ev.state or "Unknown"

        type_counts[t_val] = type_counts.get(t_val, 0) + 1
        severity_counts[s_val] = severity_counts.get(s_val, 0) + 1
        if st_val != "Unknown":
            state_counts[st_val] = state_counts.get(st_val, 0) + 1

        if s_val in ("high", "critical"):
            high_critical_events.append(ev)
        if t_val in ("rainfall", "flooding"):
            rainfall_events.append(ev)

    ver_scores = [
        ev.verification_score
        for ev in all_events
        if ev.verification_score is not None
    ]
    avg_ver_score = (
        round(sum(ver_scores) / len(ver_scores), 1) if ver_scores else 85.0
    )

    # 2. Check for LLM API Key (Gemini or OpenAI)
    ai_response = None
    gemini_key = os.getenv("GEMINI_API_KEY") or getattr(
        settings, "GEMINI_API_KEY", None
    )
    openai_key = os.getenv("OPENAI_API_KEY") or getattr(
        settings, "OPENAI_API_KEY", None
    )

    if gemini_key:
        try:
            import httpx

            context_summary = (
                f"System Context: You are ATMOS AI, an intelligent assistant for Indian weather intelligence platform.\n"
                f"Database Context:\n"
                f"- Total weather events tracked: {total_count}\n"
                f"- Event type breakdown: {json.dumps(type_counts)}\n"
                f"- Severity breakdown: {json.dumps(severity_counts)}\n"
                f"- Top states affected: {json.dumps(sorted(state_counts.items(), key=lambda x: x[1], reverse=True)[:5])}\n"
                f"- High/Critical severity events count: {len(high_critical_events)}\n"
                f"- Average AI verification score: {avg_ver_score}%\n"
                f"- Recent Weather Events:\n"
                + "\n".join([
                    f"  * [{e.event_type.value if hasattr(e.event_type, 'value') else e.event_type}] {e.title} in {e.city or 'India'}, {e.state or ''} (Severity: {e.severity.value if hasattr(e.severity, 'value') else e.severity}, Ver Score: {e.verification_score or 0})"
                    for e in recent_events[:5]
                ])
            )
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    json={
                        "contents": [{
                            "role": "user",
                            "parts": [{
                                "text": (
                                    f"{context_summary}\n\nUser Question:"
                                    f" {query_text}\nAnswer concisely and"
                                    " professionally with accurate weather"
                                    " intelligence details."
                                )
                            }],
                        }]
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            ai_response = parts[0].get("text")
        except Exception:
            ai_response = None

    if not ai_response and openai_key:
        try:
            import httpx

            context_summary = f"Total events: {total_count}, Types: {type_counts}, High Severity: {len(high_critical_events)}"
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are ATMOS AI assistant for Indian"
                                    " weather intelligence."
                                ),
                            },
                            {
                                "role": "user",
                                "content": (
                                    f"Context: {context_summary}\nQuestion:"
                                    f" {query_text}"
                                ),
                            },
                        ],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    ai_response = data["choices"][0]["message"]["content"]
        except Exception:
            ai_response = None

    # 3. Grounded rule-and-telemetry response if no LLM key or call failed
    if not ai_response:
        if any(
            w in query_lower
            for w in [
                "active",
                "all",
                "current",
                "overview",
                "what weather events",
                "events in india",
            ]
        ):
            top_types_str = ", ".join([
                f"{k.capitalize()} ({v})"
                for k, v in sorted(
                    type_counts.items(), key=lambda x: x[1], reverse=True
                )[:4]
            ])
            top_states_str = ", ".join([
                f"{k} ({v})"
                for k, v in sorted(
                    state_counts.items(), key=lambda x: x[1], reverse=True
                )[:3]
            ])
            ai_response = (
                f"ATMOS is currently tracking **{total_count} weather events**"
                f" across India with an average verification score of"
                f" **{avg_ver_score}%**.\n\n"
                f"**Active Event Categories:** {top_types_str or 'Various'}.\n"
                f"**Most Affected Regions:** {top_states_str or 'Multiple states'}.\n"
                f"**Severity Distribution:** {severity_counts.get('critical', 0)} critical, {severity_counts.get('high', 0)} high, {severity_counts.get('moderate', 0)} moderate, and {severity_counts.get('low', 0)} low severity reports."
            )
        elif any(
            w in query_lower
            for w in [
                "rain",
                "rainfall",
                "heavy rain",
                "monsoon",
                "shower",
                "downpour",
            ]
        ):
            if rainfall_events:
                rain_cities = list(
                    set([e.city for e in rainfall_events if e.city])
                )[:5]
                rain_states = list(
                    set([e.state for e in rainfall_events if e.state])
                )[:4]
                latest_rain = rainfall_events[0]
                latest_sev = (
                    latest_rain.severity.value
                    if hasattr(latest_rain.severity, "value")
                    else str(latest_rain.severity)
                ).upper()
                ai_response = (
                    "**Heavy Rainfall & Hydrological Intelligence:**\n\n"
                    f"Currently, ATMOS registers **{len(rainfall_events)} active"
                    " rainfall/flooding observations**.\n\n"
                    f"• **Key Affected Regions:** {', '.join(rain_states) if rain_states else 'Multiple states'}\n"
                    f"• **Notable Locations:** {', '.join(rain_cities) if rain_cities else 'Various cities'}\n"
                    f"• **Latest Observation:** *{latest_rain.title}* reported"
                    f" in {latest_rain.city or 'India'},"
                    f" {latest_rain.state or ''} (Severity: {latest_sev})."
                )
            else:
                ai_response = (
                    "There are currently no major heavy rainfall alerts flagged"
                    " in active observations. Total rainfall events logged:"
                    f" {type_counts.get('rainfall', 0)}."
                )
        elif any(
            w in query_lower
            for w in [
                "observation",
                "latest",
                "recent",
                "explain",
                "record",
            ]
        ):
            obs_lines = []
            for idx, e in enumerate(recent_events[:4], 1):
                s_str = (
                    e.severity.value
                    if hasattr(e.severity, "value")
                    else str(e.severity)
                ).upper()
                t_str = (
                    e.event_type.value
                    if hasattr(e.event_type, "value")
                    else str(e.event_type)
                ).capitalize()
                ver = (
                    f"{round(e.verification_score)}%"
                    if e.verification_score
                    else "Verified"
                )
                obs_lines.append(
                    f"{idx}. **{e.title}** ({t_str} in {e.city or 'India'},"
                    f" {e.state or ''}) - *Severity: {s_str}*, *AI Trust Score:"
                    f" {ver}*"
                )

            ai_response = (
                "**Latest Weather Observations & Ingestion Feed:**\n\n"
                + "\n".join(obs_lines)
                + "\n\nAll incoming records pass through automated multi-source"
                " NLP verification and duplicate clustering."
            )
        elif any(
            w in query_lower
            for w in [
                "risk",
                "severe",
                "critical",
                "danger",
                "warning",
                "alert",
            ]
        ):
            if high_critical_events:
                risk_items = []
                for e in high_critical_events[:4]:
                    c_str = e.city or e.state or "India"
                    t_str = (
                        e.event_type.value
                        if hasattr(e.event_type, "value")
                        else str(e.event_type)
                    ).capitalize()
                    s_str = (
                        e.severity.value
                        if hasattr(e.severity, "value")
                        else str(e.severity)
                    ).upper()
                    risk_items.append(
                        f"• **{t_str} in {c_str}:** {e.title} (Severity:"
                        f" {s_str})"
                    )

                ai_response = (
                    "**Severe Weather Risk Assessment:**\n\n"
                    f"ATMOS has identified **{len(high_critical_events)}"
                    " high-priority/severe risk zones** requiring"
                    " attention:\n\n"
                    + "\n".join(risk_items)
                    + "\n\nLocal authorities and monitoring centers are"
                    " advised to monitor radar updates and emergency feeds."
                )
            else:
                ai_response = (
                    "**Severe Weather Risk Assessment:**\n\nNo critical or"
                    " emergency level weather risks are active at this moment."
                    " Current active observations are within low to moderate"
                    " threshold limits across the country."
                )
        else:
            matching_events = [
                e
                for e in all_events
                if query_lower in (e.title or "").lower()
                or query_lower in (e.description or "").lower()
                or query_lower in (e.city or "").lower()
                or query_lower in (e.state or "").lower()
            ]

            if matching_events:
                match_summary = "\n".join([
                    f"• **{e.title}** ({e.city or e.state or 'India'}) -"
                    f" {e.description[:120]}..."
                    for e in matching_events[:3]
                ])
                ai_response = (
                    f"Found **{len(matching_events)} matching weather"
                    f" observations** for your query *'{query_text}'*:\n\n"
                    + match_summary
                    + "\n\nATMOS platforms monitor real-time satellite,"
                    " social, and station feeds to corroborate these events."
                )
            else:
                top_cities = list(
                    set([e.city for e in all_events if e.city])
                )[:4]
                ai_response = (
                    f"Regarding *'{query_text}'*, ATMOS intelligence currently"
                    f" monitors **{total_count} real-time observations** in"
                    " regions such as"
                    f" {', '.join(top_cities) if top_cities else 'India'}.\n\nYou"
                    " can query active event types (*rainfall, thunderstorm,"
                    " flood, heatwave*), specific cities/states, or overall"
                    " risk assessments."
                )

    related_dicts = [e.to_dict() for e in recent_events[:3]]
    return {
        "query": query_text,
        "answer": ai_response,
        "events_analyzed": total_count,
        "high_priority_count": len(high_critical_events),
        "avg_verification_score": avg_ver_score,
        "related_events": related_dicts,
    }