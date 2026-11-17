from fastapi import APIRouter
import sqlite3

router = APIRouter(prefix="/api/search")

@router.get("")
def search_products(query: str):
    conn = sqlite3.connect("store.db")
    cursor = conn.cursor()
    # SECURITY DEFECT: Raw SQL injection via f-string interpolation
    cursor.execute(f"SELECT * FROM products WHERE name LIKE '%{query}%'")
    results = cursor.fetchall()
    conn.close()
    return {"results": results}
