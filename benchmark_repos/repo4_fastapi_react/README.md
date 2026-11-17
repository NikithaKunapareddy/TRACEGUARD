# Repo 4: FastAPI + React Task Manager (Benchmark)
Intentional defects for TraceGuard evaluation.
- SQL injection via f-string in /tasks/search
- Unauthenticated admin delete endpoint
- Frontend calls DELETE /tasks/{id} which is not implemented in backend
