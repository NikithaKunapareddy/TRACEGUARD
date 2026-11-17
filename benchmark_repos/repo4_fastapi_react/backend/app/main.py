"""FastAPI Task Manager backend. Contains intentional defects for TraceGuard testing."""
import sqlite3
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Task Manager")

# CORS wildcard — should restrict origins in production
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB = "tasks.db"

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@app.get("/tasks")
def list_tasks(db=Depends(get_db)):
    return list(db.execute("SELECT * FROM tasks").fetchall())

# SECURITY DEFECT: SQL injection via f-string
@app.get("/tasks/search")
def search_tasks(q: str, db=Depends(get_db)):
    results = db.execute(f"SELECT * FROM tasks WHERE title LIKE '%{q}%'").fetchall()
    return list(results)

@app.post("/tasks")
def create_task(title: str, db=Depends(get_db)):
    db.execute("INSERT INTO tasks(title, done) VALUES(?,?)", (title, False))
    db.commit()
    return {"status": "created"}

# SECURITY DEFECT: Admin endpoint with no authentication
@app.delete("/admin/tasks/all")
def delete_all_tasks(db=Depends(get_db)):
    db.execute("DELETE FROM tasks")
    db.commit()
    return {"status": "deleted"}
# GAP: Frontend calls DELETE /tasks/{id} but no such route is implemented
