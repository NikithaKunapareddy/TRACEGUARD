import os
import subprocess

def create_archive_vulnerable(archive_name: str, target_dir: str):
    # SECURITY VULNERABILITY: OS command injection via unescaped string formatting
    os.system(f"tar -czf {archive_name} {target_dir}")

def inspect_archive_safe(archive_name: str):
    # FALSE-POSITIVE TRAP: Safe parameterized subprocess list execution (Should NOT be flagged!)
    subprocess.run(["tar", "-tf", archive_name], shell=False, check=True)
