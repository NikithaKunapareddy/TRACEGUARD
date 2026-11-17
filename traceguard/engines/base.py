"""
Base Analysis Engine Interface.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, List

from ..core.models import Finding, FileMetadata
from ..core.graph import ERCGraph
from ..core.context import AuditContext


class BaseEngine(ABC):
    """Abstract base class for TraceGuard analysis engines."""

    @abstractmethod
    def analyze(
        self,
        graph: ERCGraph,
        files_content: Dict[str, str],
        files_meta: List[FileMetadata],
        context: AuditContext,
    ) -> List[Finding]:
        """Execute engine analysis and return list of evidence-backed findings."""
        pass
