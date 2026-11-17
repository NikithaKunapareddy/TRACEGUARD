"""
Configuration Files Parsing Adapter.
Extracts declared config keys, environment definitions, and secrets metadata.
"""

from __future__ import annotations
import json
import re
from typing import Dict, Any, List

from ..core.models import (
    FileMetadata,
    NodeType,
    Symbol,
)
from ..core.graph import ERCGraph
from .base import BaseParserAdapter


class ConfigAdapter(BaseParserAdapter):
    """Adapter for .env, YAML, JSON, TOML, and properties config files."""

    def can_parse(self, file_meta: FileMetadata) -> bool:
        return file_meta.language in ("env", "json", "yaml", "toml", "ini") or file_meta.name.startswith(".env")

    def parse(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        lines = content.splitlines()

        # Handle .env files
        if file_meta.name.startswith(".env") or file_meta.language == "env":
            self._parse_env_file(file_meta, lines, graph)
        elif file_meta.language == "json":
            self._parse_json_file(file_meta, content, graph)
        elif file_meta.language in ("yaml", "toml", "ini"):
            self._parse_key_value_lines(file_meta, lines, graph)

    def _parse_env_file(self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        env_line_pat = re.compile(r'^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$')

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            if not clean or clean.startswith("#"):
                continue
            m = env_line_pat.match(clean)
            if m:
                key = m.group(1)
                val = m.group(2).strip()
                # Remove quotes if any
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                
                is_example = "example" in rel_path.lower() or "sample" in rel_path.lower()
                has_default = bool(val) and not val.startswith("your_") and not val.startswith("change_")

                cfg_id = f"cfg:{rel_path}:{key}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=cfg_id,
                        name=key,
                        kind=NodeType.CONFIG,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={
                            "key": key,
                            "source_file": rel_path,
                            "is_example": is_example,
                            "has_default": has_default,
                            "raw_value": val if not is_example else "[EXAMPLE]",
                        },
                    )
                )

    def _parse_json_file(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                self._index_dict_keys(data, rel_path, graph)
        except Exception:
            pass

    def _index_dict_keys(self, data: Dict[str, Any], rel_path: str, graph: ERCGraph, prefix: str = "") -> None:
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                self._index_dict_keys(v, rel_path, graph, full_key)
            else:
                cfg_id = f"cfg:{full_key}"
                graph.add_symbol(
                    Symbol(
                        id=cfg_id,
                        name=full_key,
                        kind=NodeType.CONFIG,
                        file=rel_path,
                        line=1,
                        end_line=1,
                        attributes={"key": full_key, "source_file": rel_path},
                    )
                )

    def _parse_key_value_lines(self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        kv_pat = re.compile(r'^\s*([A-Za-z0-9_\-\.]+)\s*[:=]\s*(.*)$')
        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            if not clean or clean.startswith("#") or clean.startswith("//"):
                continue
            m = kv_pat.match(clean)
            if m:
                key = m.group(1).strip()
                val = m.group(2).strip()
                cfg_id = f"cfg:{rel_path}:{key}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=cfg_id,
                        name=key,
                        kind=NodeType.CONFIG,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"key": key, "source_file": rel_path},
                    )
                )
