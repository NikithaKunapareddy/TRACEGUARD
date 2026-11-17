"""
Repository Scanner: Ingestion, Directory Traversal, and Safety Limits.
"""

from __future__ import annotations
import os
from pathlib import Path
from typing import Dict, List, Tuple

from ..core.context import AuditContext
from ..core.models import (
    FileMetadata,
    RepositoryOverview,
    FileRole,
)
from .classifier import TechnologyClassifier


class RepositoryScanner:
    """Safe, read-only file crawler and repository overview builder."""

    def __init__(self, context: AuditContext):
        self.context = context

    @staticmethod
    def is_binary_string(bytes_sample: bytes) -> bool:
        """Check if a sample contains null bytes or common binary markers."""
        if b"\x00" in bytes_sample:
            return True
        # Check text character ratio
        text_characters = (
            b"".join([bytes([i]) for i in range(32, 127)]) +
            b"\n\r\t\b"
        )
        if not bytes_sample:
            return False
        nontext = [b for b in bytes_sample if b not in text_characters]
        return len(nontext) / len(bytes_sample) > 0.30

    def scan(self) -> Tuple[List[FileMetadata], Dict[str, str], RepositoryOverview]:
        """
        Scan repository files, respecting safety limits and ignore patterns.
        Returns:
            - List of FileMetadata
            - Map of relative_path -> file_content
            - RepositoryOverview
        """
        files_meta: List[FileMetadata] = []
        contents: Dict[str, str] = {}
        languages_count: Dict[str, int] = {}
        role_counts: Dict[str, int] = {}
        total_lines = 0

        root = self.context.root_dir

        for dirpath, dirnames, filenames in os.walk(root):
            # Prune ignored directories in-place
            dirnames[:] = [
                d for d in dirnames
                if not self.context.should_ignore_dir(d)
            ]

            for fname in filenames:
                fpath = Path(dirpath) / fname
                if self.context.should_ignore_file(fpath):
                    continue

                if len(files_meta) >= self.context.config.max_total_files:
                    break

                try:
                    rel_path = str(fpath.relative_to(root)).replace("\\", "/")
                    size = fpath.stat().st_size
                    
                    # Read sample for binary check
                    with open(fpath, "rb") as bf:
                        sample = bf.read(1024)
                    
                    if self.is_binary_string(sample):
                        continue

                    # Read full text
                    with open(fpath, "r", encoding="utf-8", errors="replace") as tf:
                        text = tf.read()

                    loc = len(text.splitlines())
                    total_lines += loc

                    lang = TechnologyClassifier.detect_language(fpath)
                    role = TechnologyClassifier.classify_role(fpath, rel_path)

                    languages_count[lang] = languages_count.get(lang, 0) + 1
                    role_counts[role.value] = role_counts.get(role.value, 0) + 1

                    meta = FileMetadata(
                        path=str(fpath),
                        relative_path=rel_path,
                        language=lang,
                        role=role,
                        size_bytes=size,
                        lines_of_code=loc,
                        is_binary=False,
                    )
                    files_meta.append(meta)
                    contents[rel_path] = text

                except Exception:
                    continue

        frameworks = TechnologyClassifier.detect_frameworks(contents)

        overview = RepositoryOverview(
            root_path=str(root),
            total_files=len(files_meta),
            total_lines=total_lines,
            languages=languages_count,
            file_role_counts=role_counts,
            detected_frameworks=frameworks,
        )

        return files_meta, contents, overview
