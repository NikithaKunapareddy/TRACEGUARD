"""
JSON Report Serializer for TraceGuard.
"""

from __future__ import annotations
import json
from ..core.models import AuditReport


class JsonReporter:
    """Serializes AuditReport to standard JSON with full evidence metadata."""

    @staticmethod
    def render(report: AuditReport, indent: int = 2) -> str:
        return report.model_dump_json(indent=indent)
