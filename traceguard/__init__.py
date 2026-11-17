"""
TraceGuard: Architecture-Agnostic Repository Integrity Agent
"""

__version__ = "0.1.0"

from .core.models import (
    AuditReport,
    Finding,
    Severity,
    Category,
    VerificationStatus,
    NodeType,
    EdgeType,
)
from .core.graph import ERCGraph
from .core.context import AuditContext, AuditConfig
from .pipeline import AuditPipeline

__all__ = [
    "AuditReport",
    "Finding",
    "Severity",
    "Category",
    "VerificationStatus",
    "NodeType",
    "EdgeType",
    "ERCGraph",
    "AuditContext",
    "AuditConfig",
    "AuditPipeline",
]
