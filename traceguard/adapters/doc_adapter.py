"""
Documentation and Specification Parser Adapter.
Extracts declared features, documented endpoints, and contracts from Markdown and API specs.
"""

from __future__ import annotations
import re
from typing import List

from ..core.models import (
    FileMetadata,
    NodeType,
    Symbol,
)
from ..core.graph import ERCGraph
from .base import BaseParserAdapter


class DocAdapter(BaseParserAdapter):
    """Adapter for Markdown documentation, OpenAPI specs, and declared features."""

    def can_parse(self, file_meta: FileMetadata) -> bool:
        return file_meta.language == "markdown" or file_meta.name.lower().endswith((".md", ".rst"))

    def parse(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        lines = content.splitlines()

        # Documented endpoints: e.g. `GET /api/v1/export`, `POST /api/auth/register`
        doc_endpoint_pat = re.compile(
            r'(?:`|\*\*|\b)(GET|POST|PUT|DELETE|PATCH)\s+([/a-zA-Z0-9_\-\{\}:]+)(?:`|\*\*|\b)'
        )
        # Documented features: e.g. "- Feature: User Data Export", "### Export Service"
        feature_heading_pat = re.compile(r'^(?:#{1,4}\s+|\-\s+\*{0,2})([A-Z][a-zA-Z0-9_\s\-]+(?:Service|API|Export|Billing|Auth|Pipeline|Sync))')

        for idx, line in enumerate(lines, start=1):
            for match in doc_endpoint_pat.finditer(line):
                method = match.group(1).upper()
                path = match.group(2)
                if path.startswith("/"):
                    doc_ep_id = f"doc_ep:{rel_path}:{method}:{path}:{idx}"
                    graph.add_symbol(
                        Symbol(
                            id=doc_ep_id,
                            name=f"DOC {method} {path}",
                            kind=NodeType.DOC,
                            file=rel_path,
                            line=idx,
                            end_line=idx,
                            attributes={
                                "declared_path": path,
                                "declared_method": method,
                                "doc_type": "endpoint",
                            },
                        )
                    )

            # Features
            m_feat = feature_heading_pat.match(line)
            if m_feat:
                feat_name = m_feat.group(1).strip()
                feat_id = f"doc_feat:{rel_path}:{feat_name}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=feat_id,
                        name=feat_name,
                        kind=NodeType.DOC,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"doc_type": "feature", "title": feat_name},
                    )
                )
