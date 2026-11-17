"""
TraceGuard Core Data Models
Intermediate Representation (IR), Graph Elements, Finding Structures,
and Multi-Dimensional Integrity Metrics.
"""

from __future__ import annotations
import hashlib
from enum import Enum
from pathlib import Path
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
    CONFIRMED = "Confirmed"        # Direct, sufficient evidence
    PROBABLE = "Probable"          # Strong evidence exists, but peripheral context missing
    NEEDS_REVIEW = "Needs review"  # Suspicious pattern requiring human engineering review


class LifecycleState(str, Enum):
    NEW = "NEW"                    # First observed in current audit
    EXISTING = "EXISTING"          # Present in previous and current audit
    RESOLVED = "RESOLVED"          # Present in previous audit but absent in current
    REINTRODUCED = "REINTRODUCED"  # Previously resolved but reappeared in current audit
    ACCEPTED_RISK = "ACCEPTED_RISK"# Marked as accepted risk by team


class EdgeResolution(str, Enum):
    CONFIRMED = "confirmed"        # Directly validated via AST / call graph
    INFERRED = "inferred"          # Inferred via route pattern, name convention, or dynamic dispatch
    UNRESOLVED = "unresolved"      # Target cannot be statically resolved
    UNSUPPORTED = "unsupported"    # Language lacks deep AST parser in current configuration


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
    DATA_FLOW_STEP = "data_flow_step"
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
    resolution: EdgeResolution = EdgeResolution.CONFIRMED
    confidence: float = 1.0
    attributes: Dict[str, Any] = Field(default_factory=dict)


class Finding(BaseModel):
    id: str
    stable_id: Optional[str] = None
    category: Category
    subcategory: str
    title: str
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.PROBABLE
    lifecycle_state: LifecycleState = LifecycleState.NEW
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
    source_to_sink_trace: List[Dict[str, Any]] = Field(default_factory=list)
    root_cause_id: Optional[str] = None
    code_url: Optional[str] = None

    def compute_stable_id(self) -> str:
        """
        Generate a persistent, deterministic identifier that remains stable
        even if surrounding code shifts line numbers.
        """
        raw_key = f"{self.category.value}:{self.subcategory}:{self.affected_file}:{self.title}"
        h = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:12]
        prefix = {
            Category.SECURITY: "TG-SEC",
            Category.GAP: "TG-GAP",
            Category.SLOP: "TG-SLOP",
            Category.LOOSE_END: "TG-LOOSE",
        }.get(self.category, "TG")
        return f"{prefix}-{h}"


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


class GraphCoverageMetrics(BaseModel):
    total_relations: int = 0
    resolved_relations: int = 0
    inferred_relations: int = 0
    unresolved_relations: int = 0
    resolution_rate: float = 1.0
    language_support: Dict[str, str] = Field(default_factory=dict)


class IntegrityAssessment(BaseModel):
    overall_score: float = 100.0  # 0 to 100 composite
    rating: str = "EXCELLENT"      # EXCELLENT, GOOD, FAIR, POOR, CRITICAL

    # 4 Independent Dimensions
    security_risk_score: float = 100.0              # 100 = safe, 0 = severe risk
    implementation_completeness_score: float = 100.0 # 100 = complete, 0 = severe gaps
    code_quality_score: float = 100.0               # 100 = clean, 0 = heavy slop
    development_hygiene_score: float = 100.0        # 100 = polished, 0 = many loose ends

    dimension_scores: Dict[str, float] = Field(default_factory=dict)
    scoring_weights: Dict[str, float] = Field(default_factory=dict)
    evidence_sufficiency: str = "SUFFICIENT"        # SUFFICIENT, PARTIAL, INSUFFICIENT_EVIDENCE
    disclaimer: str = (
        "TraceGuard integrity scores are heuristic engineering indicators derived from "
        "static repository analysis and evidence-linked consistency graphs. They do not "
        "constitute an official security certification or regulatory compliance guarantee."
    )

    findings_by_category: Dict[str, int] = Field(default_factory=dict)
    findings_by_severity: Dict[str, int] = Field(default_factory=dict)
    findings_by_status: Dict[str, int] = Field(default_factory=dict)
    findings_by_lifecycle: Dict[str, int] = Field(default_factory=dict)
    summary_verdict: str = ""


class AuditReport(BaseModel):
    overview: RepositoryOverview
    assessment: IntegrityAssessment
    findings: List[Finding] = Field(default_factory=list)
    graph_stats: Dict[str, int] = Field(default_factory=dict)
    graph_coverage: Optional[GraphCoverageMetrics] = None
    execution_time_seconds: float = 0.0
    audit_id: Optional[str] = None
    is_incremental: bool = False
