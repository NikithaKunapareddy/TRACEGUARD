"""
Language Detection, Technology Identification, and File Role Classification.
"""

from __future__ import annotations
import re
from pathlib import Path
from typing import Dict, List, Tuple
from ..core.models import FileRole


EXTENSION_LANGUAGE_MAP: Dict[str, str] = {
    ".py": "python",
    ".pyw": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".toml": "toml",
    ".ini": "ini",
    ".env": "env",
    ".md": "markdown",
    ".rst": "rst",
    ".html": "html",
    ".css": "css",
}


class TechnologyClassifier:
    """Classifies files into roles, identifies language, and detects frameworks."""

    @staticmethod
    def detect_language(path: Path) -> str:
        name = path.name.lower()
        if name in ("dockerfile", "containerfile"):
            return "dockerfile"
        if name in ("makefile", "gnumakefile"):
            return "makefile"
        if name.startswith(".env"):
            return "env"
        
        ext = path.suffix.lower()
        return EXTENSION_LANGUAGE_MAP.get(ext, "text")

    @staticmethod
    def classify_role(path: Path, relative_str: str) -> FileRole:
        rel_lower = relative_str.lower().replace("\\", "/")
        name_lower = path.name.lower()

        # Tests
        if (
            "/tests/" in rel_lower
            or "/test/" in rel_lower
            or "/__tests__/" in rel_lower
            or name_lower.startswith("test_")
            or name_lower.endswith("_test.py")
            or name_lower.endswith(".test.ts")
            or name_lower.endswith(".test.js")
            or name_lower.endswith(".spec.ts")
            or name_lower.endswith(".spec.js")
            or name_lower.endswith("_test.go")
        ):
            return FileRole.TEST

        # Migrations
        if "/migration" in rel_lower or "/alembic/" in rel_lower or "/migrate/" in rel_lower:
            return FileRole.MIGRATION

        # Models
        if (
            "/models" in rel_lower
            or "/entities" in rel_lower
            or "/schemas" in rel_lower
            or name_lower.endswith("_model.py")
            or name_lower == "models.py"
        ):
            return FileRole.MODEL

        # Documentation
        if (
            rel_lower.startswith("docs/")
            or "/docs/" in rel_lower
            or name_lower in ("readme.md", "architecture.md", "contributing.md", "license", "changelog.md")
            or path.suffix.lower() in (".md", ".rst", ".txt")
        ):
            return FileRole.DOC

        # Config & Build
        if (
            name_lower.startswith(".env")
            or name_lower in (
                "package.json",
                "tsconfig.json",
                "requirements.txt",
                "pyproject.toml",
                "setup.py",
                "setup.cfg",
                "go.mod",
                "go.sum",
                "cargo.toml",
                "gemfile",
                "pom.xml",
                "build.gradle",
                "dockerfile",
                "docker-compose.yml",
                "docker-compose.yaml",
                "makefile",
            )
            or path.suffix.lower() in (".yaml", ".yml", ".toml", ".ini", ".env")
        ):
            return FileRole.CONFIG

        # Frontend
        if (
            "/frontend/" in rel_lower
            or "/client/" in rel_lower
            or "/ui/" in rel_lower
            or "/components/" in rel_lower
            or "/views/" in rel_lower
            or "/pages/" in rel_lower
            or path.suffix.lower() in (".tsx", ".jsx", ".vue", ".svelte", ".html", ".css", ".scss")
        ):
            return FileRole.FRONTEND

        # Backend
        if (
            "/backend/" in rel_lower
            or "/server/" in rel_lower
            or "/api/" in rel_lower
            or "/controllers/" in rel_lower
            or "/routes/" in rel_lower
            or "/services/" in rel_lower
            or "/handlers/" in rel_lower
            or path.suffix.lower() in (".py", ".go", ".java", ".rs", ".php", ".rb")
        ):
            return FileRole.BACKEND

        return FileRole.UNKNOWN

    @staticmethod
    def detect_frameworks(files_content: Dict[str, str]) -> List[str]:
        """Detect web, DB, and application frameworks across repository files."""
        frameworks = set()

        for filename, content in files_content.items():
            fn_lower = filename.lower()
            
            # Python frameworks
            if "fastapi" in content:
                frameworks.add("FastAPI")
            if "flask" in content:
                frameworks.add("Flask")
            if "django" in content:
                frameworks.add("Django")
            if "sqlalchemy" in content:
                frameworks.add("SQLAlchemy")
            if "pydantic" in content:
                frameworks.add("Pydantic")

            # JS/TS frameworks
            if "express" in content:
                frameworks.add("Express")
            if "react" in content:
                frameworks.add("React")
            if "next" in content and ("next/router" in content or "next/server" in content or "next" in fn_lower):
                frameworks.add("Next.js")
            if "vue" in content:
                frameworks.add("Vue")
            if "fastify" in content:
                frameworks.add("Fastify")

            # Go frameworks
            if "gin-gonic/gin" in content:
                frameworks.add("Gin")
            if "labstack/echo" in content:
                frameworks.add("Echo")

        return sorted(list(frameworks))
