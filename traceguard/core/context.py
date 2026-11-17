"""
Audit Context, Resource Limits, Path Safety, and Secret Masking.
"""

from __future__ import annotations
import os
import re
from pathlib import Path
from typing import List, Set, Optional
from pydantic import BaseModel, Field


DEFAULT_IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "node_modules",
    "bower_components",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".venv",
    "venv",
    "env",
    ".tox",
    "vendor",
    "target",  # Rust / Maven
    "bin",
    "obj",
    ".idea",
    ".vscode",
}

DEFAULT_IGNORED_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".class",
    ".jar",
    ".war",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".bin",
    ".iso",
    ".tar",
    ".gz",
    ".zip",
    ".7z",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".webp",
    ".mp3",
    ".mp4",
    ".wav",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".min.js",
    ".min.css",
    ".map",
}


class AuditConfig(BaseModel):
    max_file_size_bytes: int = 5 * 1024 * 1024  # 5 MB
    max_total_files: int = 15000
    custom_ignore_patterns: List[str] = Field(default_factory=list)
    categories_filter: Optional[List[str]] = None
    min_severity: Optional[str] = None
    redact_secrets: bool = True
    read_only: bool = True


class AuditContext:
    def __init__(
        self,
        root_dir: str | Path,
        config: Optional[AuditConfig] = None,
        audit_id: Optional[str] = None,
    ):
        self.root_dir = Path(root_dir).resolve()
        self.repo_path = self.root_dir
        self.config = config or AuditConfig()
        self.audit_id = audit_id
        self.ignored_dirs: Set[str] = set(DEFAULT_IGNORED_DIRS)
        self.ignored_extensions: Set[str] = set(DEFAULT_IGNORED_EXTENSIONS)
        self._load_ignore_files()

    def _load_ignore_files(self) -> None:
        """Load patterns from .gitignore and .traceguardignore."""
        ignore_files = [".gitignore", ".traceguardignore"]
        for fname in ignore_files:
            fpath = self.root_dir / fname
            if fpath.is_file():
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            clean = line.strip()
                            if clean and not clean.startswith("#"):
                                if clean.endswith("/"):
                                    self.ignored_dirs.add(clean.rstrip("/"))
                                else:
                                    self.config.custom_ignore_patterns.append(clean)
                except Exception:
                    pass

    def should_ignore_dir(self, dir_name: str) -> bool:
        return dir_name in self.ignored_dirs or dir_name.startswith(".")

    def should_ignore_file(self, file_path: Path) -> bool:
        # Check extensions
        ext = file_path.suffix.lower()
        if ext in self.ignored_extensions:
            return True

        name = file_path.name
        # Common minified patterns
        if ".min." in name or ".bundle." in name:
            return True

        # Check size limit
        try:
            if file_path.stat().st_size > self.config.max_file_size_bytes:
                return True
        except Exception:
            return True

        # Check custom patterns
        rel_path = str(file_path.relative_to(self.root_dir)).replace("\\", "/")
        for pat in self.config.custom_ignore_patterns:
            if pat in rel_path or pat == name:
                return True

        return False

    def is_safe_path(self, path: Path) -> bool:
        """Verify the path is strictly within the repository root (sandbox containment)."""
        try:
            resolved = path.resolve()
            return self.root_dir in resolved.parents or resolved == self.root_dir
        except Exception:
            return False

    @staticmethod
    def mask_secret(text: str) -> str:
        """
        Mask any exposed credentials, tokens, or private keys so they never appear
        in logs, terminal outputs, or reports.
        """
        patterns = [
            # AWS Access Key
            (r'(?i)(AKIA[0-9A-Z]{16})', lambda m: m.group(1)[:4] + "*" * 12 + m.group(1)[-4:]),
            # GitHub Token
            (r'(gh[pousr]_[A-Za-z0-9_]{36,255})', lambda m: m.group(1)[:4] + "*" * 20),
            # Generic API Keys / Bearer Tokens / Passwords in assignments
            (r'''(?i)(password|secret|api_key|token|auth|bearer)\s*[:=]\s*['"]([A-Za-z0-9_\-\.]{8,})['"]''',
             lambda m: f'{m.group(1)}="{"*" * len(m.group(2))}"'),
            # Private keys
            (r'-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----',
             '[REDACTED PRIVATE KEY]'),
        ]

        redacted = text
        for pat, repl in patterns:
            try:
                redacted = re.sub(pat, repl, redacted)
            except Exception:
                pass
        return redacted
