"""
TraceGuard Core Data Models
Intermediate Representation (IR), Graph Elements, and Finding Structures.
"""

from __future__ import annotations
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

    @property
    def score(self) -> int:
        scores = {
            Severity.CRITICAL: 10,
            Severity.HIGH: 7,
            Severity.MEDIUM: 4,
            Severity.LOW: 2,
            Severity.INFO: 1,
        }
        return scores.get(self, 1)


class Category(str, Enum):
    SECURITY = "security"
    SLOP = "slop"
    GAP = "gap"
    LOOSE_END = "loose_end"


class VerificationStatus(str, Enum):
    CONFIRMED = "Confirmed"      # Direct, sufficient evidence
    PROBABLE = "Probable"        # Strong evidence exists, but minor context is missing
    NEEDS_REVIEW = "Needs review" # Suspicious pattern requiring human review


class NodeType(str, Enum):
    FILE = "file"
    MODULE = "module"
    FUNCTION = "function"
    CLASS = "class"
    INTERFACE = "interface"
    ENDPOINT = "endpoint"
    API_CALL = "api_call"
    CONFIG = "config"
    DB_MODEL = "db_model"
    DB_MIGRATION = "db_migration"
    TEST = "test"
    DOC = "doc"
    SINK = "sink"
    GUARD = "guard"


class EdgeType(str, Enum):
    CALLS = "calls"
    IMPORTS = "imports"
    DEFINES = "defines"
    USES_CONFIG = "uses_config"
    QUERIES_DB = "queries_db"
    ROUTES_TO = "routes_to"
    TESTS = "tests"
    DECLARES = "declares"
    GUARDS = "guards"
    DATA_FLOW_TO = "data_flow_to"
    EXTENDS = "extends"
    IMPLEMENTS = "implements"


class FileRole(str, Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    TEST = "test"
    CONFIG = "config"
    MIGRATION = "migration"
    MODEL = "model"
    DOC = "doc"
    BUILD = "build"
    FIXTURE = "fixture"
    UNKNOWN = "unknown"


class Evidence(BaseModel):
    file: str
    line: int
    end_line: Optional[int] = None
    snippet: str
    context: str = ""


class Symbol(BaseModel):
    id: str
    name: str
    kind: NodeType
    file: str
    line: int
    end_line: int
    docstring: Optional[str] = None
    exported: bool = False
    signature: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)


class Relation(BaseModel):
    source: str
    target: str
    relation: EdgeType
    evidence: Evidence
    attributes: Dict[str, Any] = Field(default_factory=dict)


class Finding(BaseModel):
    id: str
    category: Category
    subcategory: str
    title: str
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.PROBABLE
    affected_file: str
    line_number: int
    end_line_number: Optional[int] = None
    snippet: str
    supporting_evidence: List[str] = Field(default_factory=list)
    counterevidence_considered: List[str] = Field(default_factory=list)
    technical_explanation: str
    potential_impact: str
    recommended_remediation: str
    related_nodes: List[str] = Field(default_factory=list)
    root_cause_id: Optional[str] = None


from pathlib import Path


class FileMetadata(BaseModel):
    path: str
    relative_path: str
    language: str
    role: FileRole
    size_bytes: int
    lines_of_code: int
    is_binary: bool = False

    @property
    def name(self) -> str:
        return Path(self.relative_path).name



class RepositoryOverview(BaseModel):
    root_path: str
    total_files: int
    total_lines: int
    languages: Dict[str, int] = Field(default_factory=dict)
    file_role_counts: Dict[str, int] = Field(default_factory=dict)
    detected_frameworks: List[str] = Field(default_factory=list)


class IntegrityAssessment(BaseModel):
    overall_score: float = 100.0  # 0 to 100
    rating: str = "EXCELLENT"      # EXCELLENT, GOOD, FAIR, POOR, CRITICAL
    findings_by_category: Dict[str, int] = Field(default_factory=dict)
    findings_by_severity: Dict[str, int] = Field(default_factory=dict)
    findings_by_status: Dict[str, int] = Field(default_factory=dict)
    summary_verdict: str = ""


class AuditReport(BaseModel):
    overview: RepositoryOverview
    assessment: IntegrityAssessment
    findings: List[Finding] = Field(default_factory=list)
    graph_stats: Dict[str, int] = Field(default_factory=dict)
    execution_time_seconds: float = 0.0
