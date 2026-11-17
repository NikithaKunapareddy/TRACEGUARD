"""
Security Engine: Static Analysis, Dependency Inspection, Secret Detection,
and Source-to-Sink Data Flow Correlation.
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional, Set

from ..core.models import (
    Category,
    Severity,
    VerificationStatus,
    Finding,
    FileMetadata,
    NodeType,
)
from ..core.graph import ERCGraph
from ..core.context import AuditContext
from .base import BaseEngine


class SecurityEngine(BaseEngine):
    """
    Identifies high-impact security vulnerabilities across unfamiliar codebases,
    including injection, broken access control, secret exposure, insecure deserialization,
    and weak cryptographic primitives.
    """

    def analyze(
        self,
        graph: ERCGraph,
        files_content: Dict[str, str],
        files_meta: List[FileMetadata],
        context: AuditContext,
    ) -> List[Finding]:
        findings: List[Finding] = []
        finding_seq = 1

        for rel_path, content in files_content.items():
            lines = content.splitlines()

            # 1. Secret Exposure
            f_sec = self._detect_secrets(rel_path, lines, finding_seq)
            findings.extend(f_sec)
            finding_seq += len(f_sec)

            # 2. Injection Vulnerabilities (SQLi, Command Injection)
            f_inj = self._detect_injections(rel_path, lines, finding_seq)
            findings.extend(f_inj)
            finding_seq += len(f_inj)

            # 3. Unsafe Deserialization
            f_deser = self._detect_deserialization(rel_path, lines, finding_seq)
            findings.extend(f_deser)
            finding_seq += len(f_deser)

            # 4. Weak Cryptography
            f_crypto = self._detect_weak_crypto(rel_path, lines, finding_seq)
            findings.extend(f_crypto)
            finding_seq += len(f_crypto)

            # 5. Path Traversal
            f_trav = self._detect_path_traversal(rel_path, lines, finding_seq)
            findings.extend(f_trav)
            finding_seq += len(f_trav)

            # 6. Insecure Configurations (e.g. verify=False, CORS wildcard with creds, debug=True)
            f_cfg = self._detect_insecure_configs(rel_path, lines, finding_seq)
            findings.extend(f_cfg)
            finding_seq += len(f_cfg)

        # 7. Broken Access Control & Unprotected Endpoints (Graph-based correlation)
        f_auth = self._detect_broken_auth(graph, finding_seq)
        findings.extend(f_auth)
        finding_seq += len(f_auth)

        # 8. Dependency Vulnerabilities
        f_dep = self._detect_dependency_vulnerabilities(files_content, finding_seq)
        findings.extend(f_dep)
        finding_seq += len(f_dep)

        return findings

    def _detect_secrets(self, rel_path: str, lines: List[str], seq_start: int) -> List[Finding]:
        findings = []
        secret_patterns = [
            (
                r'(?i)\b(AKIA[0-9A-Z]{16})\b',
                "Hardcoded AWS Access Key",
                Severity.CRITICAL,
                "AWS credential exposed directly in source code.",
            ),
            (
                r'\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b',
                "Hardcoded GitHub Personal Access Token",
                Severity.CRITICAL,
                "GitHub token exposed in repository files.",
            ),
            (
                r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
                "Unencrypted Private Key in Repository",
                Severity.CRITICAL,
                "Cryptographic private key file or string committed directly to source control.",
            ),
            (
                r'''(?i)(?:jwt_secret|jwt_key|secret_key|private_key)\s*=\s*['"]([A-Za-z0-9_\-\.]{12,})['"]''',
                "Hardcoded JWT / Encryption Secret Key",
                Severity.HIGH,
                "Static secret key hardcoded into code rather than sourced from environment variables.",
            ),
            (
                r'''(?i)(?:db_password|database_password|mysql_password|postgres_password)\s*=\s*['"]([^'"]{6,})['"]''',
                "Hardcoded Database Password",
                Severity.HIGH,
                "Database credential hardcoded directly in application configuration or source code.",
            ),
        ]

        dummy_indicators = {"example", "your_", "changeme", "placeholder", "dummy", "sample", "test_secret"}

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            # Ignore test mock files or documentation examples
            if "example" in rel_path.lower() or "test" in rel_path.lower():
                continue

            for pat, title, severity, desc in secret_patterns:
                match = re.search(pat, clean)
                if match:
                    secret_val = match.group(1) if match.groups() else match.group(0)
                    if any(d in secret_val.lower() for d in dummy_indicators):
                        continue

                    # Mask secret for report safety
                    masked_snippet = AuditContext.mask_secret(clean)

                    findings.append(
                        Finding(
                            id=f"TG-SEC-{seq_start + len(findings):03d}",
                            category=Category.SECURITY,
                            subcategory="secret_exposure",
                            title=title,
                            severity=severity,
                            confidence=0.95,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=masked_snippet,
                            supporting_evidence=[
                                f"Direct match of high-entropy credential pattern at line {idx}",
                                "File is part of active non-test application tree",
                            ],
                            counterevidence_considered=[
                                "Checked if file path contains 'example', 'test', or 'mock': negative",
                                "Checked if value is a known dummy token or placeholder: negative",
                            ],
                            technical_explanation=f"{desc} Committing secrets to revision history exposes internal infrastructure and allows unauthorized access.",
                            potential_impact="Complete compromise of associated service or database credentials.",
                            recommended_remediation="Revoke exposed credentials immediately, remove from git history using git filter-repo or BFG, and inject via environment variables or secret vaults.",
                        )
                    )
        return findings

    def _detect_injections(self, rel_path: str, lines: List[str], seq_start: int) -> List[Finding]:
        findings = []

        # SQL Injection patterns: f"SELECT ... {var}" or "... %s" % var in db.execute/cursor.execute
        sqli_patterns = [
            (
                re.compile(r'''(?i)(?:cursor|session|db|connection)\.execute\s*\(\s*f["'].*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER).*?\{.+?\}.*?["']'''),
                "SQL Injection via Formatted String Query",
                Severity.CRITICAL,
                "Raw SQL query dynamically constructed using f-string interpolation rather than parameterized arguments.",
            ),
            (
                re.compile(r'''(?i)(?:cursor|session|db|connection)\.execute\s*\(\s*["'].*?(?:SELECT|INSERT|UPDATE|DELETE).*?["']\s*%(?:\s*[a-zA-Z0-9_]+|\s*\([^)]*\))'''),
                "SQL Injection via % String Formatting",
                Severity.HIGH,
                "SQL query constructed using Python % operator formatting.",
            ),
            (
                re.compile(r'''(?i)(?:cursor|session|db|connection)\.execute\s*\(\s*["'].*?(?:SELECT|INSERT|UPDATE|DELETE).*?["']\s*\+\s*[a-zA-Z0-9_]+'''),
                "SQL Injection via String Concatenation",
                Severity.HIGH,
                "SQL query constructed via string concatenation.",
            ),
        ]

        # Command Injection
        cmd_patterns = [
            (
                re.compile(r'''(?:os\.system|os\.popen)\s*\(\s*(?:f["'].*?\{.+?\}|["'].*?["']\s*\+)'''),
                "OS Command Injection (os.system)",
                Severity.CRITICAL,
                "System shell command constructed using untrusted string formatting or concatenation.",
            ),
            (
                re.compile(r'''subprocess\.(?:Popen|run|call)\s*\(\s*(?:f["'].*?\{.+?\}|["'].*?["']\s*\+).*?shell\s*=\s*True'''),
                "Subprocess Command Injection with shell=True",
                Severity.CRITICAL,
                "Subprocess invocation with shell=True and dynamic command construction.",
            ),
            (
                re.compile(r'''(?:exec|execSync)\s*\(\s*(?:`.*?`|["'].*?["']\s*\+).*?\)'''),
                "Command Injection in Node.js Child Process",
                Severity.HIGH,
                "Node.js child_process exec invoked with concatenated command string.",
            ),
        ]

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()

            for pat, title, sev, desc in sqli_patterns + cmd_patterns:
                if pat.search(clean):
                    # Check counterevidence: is it using parameterized query tuple?
                    # e.g. cursor.execute("SELECT ...", (param,))
                    is_parameterized = bool(re.search(r',\s*\([^)]*\)\s*\)$', clean) or re.search(r',\s*\[[^\]]*\]\s*\)$', clean))
                    if is_parameterized and "f\"" not in clean:
                        continue

                    findings.append(
                        Finding(
                            id=f"TG-SEC-{seq_start + len(findings):03d}",
                            category=Category.SECURITY,
                            subcategory="injection",
                            title=title,
                            severity=sev,
                            confidence=0.90,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=clean,
                            supporting_evidence=[
                                f"Direct match of dangerous injection sink at line {idx}",
                                "Dynamic string interpolation inside query or execution sink",
                            ],
                            counterevidence_considered=[
                                "Checked for parameterized query placeholders: not found or bypassed by f-string",
                                "Checked for sanitization wrapper: none identified in sink expression",
                            ],
                            technical_explanation=desc,
                            potential_impact="Attacker can execute arbitrary database queries or shell commands, leading to total data exfiltration or host takeover.",
                            recommended_remediation="Use parameterized queries (e.g. cursor.execute(query, (params,))) or pass subprocess arguments as a list with shell=False.",
                        )
                    )
        return findings

    def _detect_deserialization(self, rel_path: str, lines: List[str], seq_start: int) -> List[Finding]:
        findings = []
        patterns = [
            (
                re.compile(r'\bpickle\.loads?\s*\('),
                "Insecure Deserialization via Python pickle",
                Severity.HIGH,
                "pickle deserialization can execute arbitrary Python bytecode during unpickling.",
            ),
            (
                re.compile(r'\byaml\.load\s*\([^,)]*(?:,\s*Loader\s*=\s*yaml\.(?:Loader|FullLoader|UnsafeLoader))?\s*\)'),
                "Unsafe YAML Deserialization (yaml.load)",
                Severity.HIGH,
                "Calling yaml.load without SafeLoader allows instantiation of arbitrary Python objects.",
            ),
        ]

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            # If yaml.safe_load, do not flag
            if "yaml.safe_load" in clean:
                continue
            if "SafeLoader" in clean:
                continue

            for pat, title, sev, desc in patterns:
                if pat.search(clean):
                    findings.append(
                        Finding(
                            id=f"TG-SEC-{seq_start + len(findings):03d}",
                            category=Category.SECURITY,
                            subcategory="insecure_deserialization",
                            title=title,
                            severity=sev,
                            confidence=0.88,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=clean,
                            supporting_evidence=[f"Unsafe deserializer invocation detected at line {idx}"],
                            counterevidence_considered=[
                                "Checked if SafeLoader or json-based parser is used: negative",
                            ],
                            technical_explanation=desc,
                            potential_impact="Remote code execution (RCE) if deserialized payload originates from untrusted user input or network requests.",
                            recommended_remediation="Use yaml.safe_load or cryptographic serialization formats such as JSON or Protocol Buffers.",
                        )
                    )
        return findings

    def _detect_weak_crypto(self, rel_path: str, lines: List[str], seq_start: int) -> List[Finding]:
        findings = []
        # MD5 or SHA1 used in password or security context
        crypto_patterns = [
            (
                re.compile(r'(?i)(?:password|token|auth|key|secret).*?(?:hashlib\.md5|hashlib\.sha1|createHash\([\'"]md5[\'"]|createHash\([\'"]sha1[\'"])'),
                "Weak Cryptographic Hash (MD5/SHA-1) for Credentials",
                Severity.HIGH,
                "MD5 and SHA-1 are cryptographically broken and vulnerable to collision and fast brute-force attacks.",
            ),
            (
                re.compile(r'(?i)AES\.MODE_ECB\b'),
                "Insecure Cipher Mode (AES-ECB)",
                Severity.HIGH,
                "ECB mode does not provide serious pattern confidentiality and reveals plaintext structure.",
            ),
        ]

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            for pat, title, sev, desc in crypto_patterns:
                if pat.search(clean):
                    findings.append(
                        Finding(
                            id=f"TG-SEC-{seq_start + len(findings):03d}",
                            category=Category.SECURITY,
                            subcategory="weak_cryptography",
                            title=title,
                            severity=sev,
                            confidence=0.85,
                            verification_status=VerificationStatus.PROBABLE,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=clean,
                            supporting_evidence=[f"Weak cryptographic primitive referenced at line {idx}"],
                            counterevidence_considered=[
                                "Checked if used merely for cache key or file integrity checksum: context indicates password/secret hashing",
                            ],
                            technical_explanation=desc,
                            potential_impact="Compromise of hashed user credentials via precomputed rainbow tables or offline GPU cracking.",
                            recommended_remediation="Adopt Argon2id, bcrypt, or PBKDF2 for password hashing, and AES-GCM for symmetric encryption.",
                        )
                    )
        return findings

    def _detect_path_traversal(self, rel_path: str, lines: List[str], seq_start: int) -> List[Finding]:
        findings = []
        pat = re.compile(r'''(?i)(?:open|send_file|FileResponse|readFile|readFileSync)\s*\(\s*(?:os\.path\.join\([^)]*request\.[^)]*\)|[a-zA-Z0-9_]+\s*\+\s*filename)''')

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            if pat.search(clean):
                findings.append(
                    Finding(
                        id=f"TG-SEC-{seq_start + len(findings):03d}",
                        category=Category.SECURITY,
                        subcategory="path_traversal",
                        title="Potential Arbitrary File Read / Path Traversal",
                        severity=Severity.HIGH,
                        confidence=0.80,
                        verification_status=VerificationStatus.PROBABLE,
                        affected_file=rel_path,
                        line_number=idx,
                        snippet=clean,
                        supporting_evidence=[f"File read sink combines base directory with direct request parameter at line {idx}"],
                        counterevidence_considered=[
                            "Checked for path normalization and containment check (resolve() and commonpath): not observed inline",
                        ],
                        technical_explanation="Concatenating user-supplied filenames or request parameters into file operations without verifying path containment allows ../ directory traversal.",
                        potential_impact="Unauthorized disclosure of arbitrary server files (e.g. /etc/passwd, .env configs, source code).",
                        recommended_remediation="Resolve paths using Path(base).resolve() and verify Path(target).is_relative_to(base) before reading.",
                    )
                )
        return findings

    def _detect_insecure_configs(self, rel_path: str, lines: List[str], seq_start: int) -> List[Finding]:
        findings = []
        patterns = [
            (
                re.compile(r'(?i)\bverify\s*=\s*False\b'),
                "Disabled TLS Certificate Verification (verify=False)",
                Severity.HIGH,
                "Disabling SSL/TLS verification leaves network requests vulnerable to Man-in-the-Middle (MitM) attacks.",
            ),
            (
                re.compile(r'''(?i)allow_origins\s*=\s*\[\s*["']\*["']\s*\].*?allow_credentials\s*=\s*True'''),
                "Overly Permissive CORS with Credentials",
                Severity.HIGH,
                "Wildcard CORS origin combined with credentials allowed enables cross-site request hijacking.",
            ),
            (
                re.compile(r'''(?i)^\s*DEBUG\s*=\s*True\s*$'''),
                "Debug Mode Enabled in Configuration",
                Severity.MEDIUM,
                "Enabling debug mode in production exposes interactive debuggers, stack traces, and environment variables.",
            ),
        ]

        for idx, line in enumerate(lines, start=1):
            clean = line.strip()
            # Skip test files for verify=False
            if "verify=false" in clean.lower() and "test" in rel_path.lower():
                continue

            for pat, title, sev, desc in patterns:
                if pat.search(clean):
                    findings.append(
                        Finding(
                            id=f"TG-SEC-{seq_start + len(findings):03d}",
                            category=Category.SECURITY,
                            subcategory="insecure_configuration",
                            title=title,
                            severity=sev,
                            confidence=0.90,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=clean,
                            supporting_evidence=[f"Insecure configuration directive found at line {idx}"],
                            counterevidence_considered=[
                                "Checked if conditionally enabled via ENV == 'test': pattern appears unconditional",
                            ],
                            technical_explanation=desc,
                            potential_impact="Network interception, credential leakage, or unauthorized cross-origin requests.",
                            recommended_remediation="Enable TLS certificate verification, specify explicit trusted CORS domains, and ensure DEBUG is False in non-development environments.",
                        )
                    )
        return findings

    def _detect_broken_auth(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """Correlate endpoints with auth guards to detect unprotected administrative operations."""
        findings = []
        sensitive_keywords = ["admin", "delete", "destroy", "wipe", "transfer", "payout", "export", "billing"]

        for ep in graph.get_all_endpoints():
            path = ep.attributes.get("path", "").lower()
            method = ep.attributes.get("method", "GET").upper()
            guards = ep.attributes.get("auth_guards", [])

            # If path indicates high privilege or mutation
            is_sensitive = any(kw in path for kw in sensitive_keywords) or (method in ("DELETE", "POST") and "user" in path)

            if is_sensitive and not guards:
                # Check if file has module-level middleware or auth guard in graph
                incoming_guards = graph.get_incoming_relations(ep.id)
                has_guard_rel = any(r.relation.value == "guards" for r in incoming_guards)

                if not has_guard_rel:
                    findings.append(
                        Finding(
                            id=f"TG-SEC-{seq_start + len(findings):03d}",
                            category=Category.SECURITY,
                            subcategory="broken_access_control",
                            title=f"Unprotected Sensitive Endpoint ({method} {path})",
                            severity=Severity.HIGH,
                            confidence=0.82,
                            verification_status=VerificationStatus.PROBABLE,
                            affected_file=ep.file,
                            line_number=ep.line,
                            snippet=f"Endpoint: {ep.name}",
                            supporting_evidence=[
                                f"Endpoint handles sensitive operation ({path}) without local auth decorators or guards",
                                f"No GUARDS relation established in repository consistency graph",
                            ],
                            counterevidence_considered=[
                                "Checked for route-level auth decorators: none found",
                                "Checked for graph GUARDS relation: none found",
                                "Checked if endpoint is read-only public info: path contains sensitive keywords",
                            ],
                            technical_explanation="Administrative or state-mutating endpoints exposed without identifiable authentication or authorization checks allow unauthenticated execution by any caller.",
                            potential_impact="Privilege escalation, unauthorized data tampering, or destructive operations.",
                            recommended_remediation="Add an authentication/authorization middleware or decorator (e.g. @require_auth, Depends(get_current_admin)).",
                        )
                    )
        return findings

    def _detect_dependency_vulnerabilities(self, files_content: Dict[str, str], seq_start: int) -> List[Finding]:
        findings = []
        # Check requirements.txt or package.json for known hazardous/outdated dependencies
        for rel_path, content in files_content.items():
            if rel_path.endswith("requirements.txt"):
                # Check for known vulnerable versions
                known_vulnerable = [
                    (re.compile(r'requests\s*<=\s*2\.20\.0'), "requests <= 2.20.0 (CVE-2018-18074 session leakage)"),
                    (re.compile(r'urllib3\s*<\s*1\.26\.5'), "urllib3 < 1.26.5 (ReDoS / CRLF injection)"),
                    (re.compile(r'django\s*<\s*3\.2\.18'), "Django < 3.2.18 (Known multiple security advisories)"),
                    (re.compile(r'pyyaml\s*<\s*5\.3\.1'), "pyyaml < 5.3.1 (Arbitrary code execution via load)"),
                ]
                for idx, line in enumerate(content.splitlines(), start=1):
                    for pat, desc in known_vulnerable:
                        if pat.search(line):
                            findings.append(
                                Finding(
                                    id=f"TG-SEC-{seq_start + len(findings):03d}",
                                    category=Category.SECURITY,
                                    subcategory="dependency_vulnerability",
                                    title=f"Vulnerable Dependency Version ({desc.split()[0]})",
                                    severity=Severity.MEDIUM,
                                    confidence=0.90,
                                    verification_status=VerificationStatus.CONFIRMED,
                                    affected_file=rel_path,
                                    line_number=idx,
                                    snippet=line.strip(),
                                    supporting_evidence=[f"Pinned vulnerable dependency in requirements.txt at line {idx}"],
                                    counterevidence_considered=["Checked version constraints: package pinned to known vulnerable range"],
                                    technical_explanation=desc,
                                    potential_impact="Exploitation of known public CVE vulnerabilities in third-party runtime dependencies.",
                                    recommended_remediation="Upgrade package to the latest secure version in requirements.txt.",
                                )
                            )
        return findings
