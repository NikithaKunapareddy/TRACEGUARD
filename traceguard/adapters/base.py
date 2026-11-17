"""
Base Parser Adapter Interface.
Defines the contract for language and format-specific AST and lexical extractors.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from ..core.models import FileMetadata
from ..core.graph import ERCGraph


class BaseParserAdapter(ABC):
    """Abstract base class for repository parsing adapters."""

    @abstractmethod
    def can_parse(self, file_meta: FileMetadata) -> bool:
        """Return True if this adapter supports parsing the given file."""
        pass

    @abstractmethod
    def parse(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        """
        Extract symbols, relations, evidence, endpoints, and configs from content
        and populate the ERCGraph.
        """
        pass
