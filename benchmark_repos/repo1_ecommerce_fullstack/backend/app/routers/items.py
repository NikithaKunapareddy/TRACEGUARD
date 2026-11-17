from fastapi import APIRouter
import sqlite3

router = APIRouter(prefix="/api/items")

@router.get("/{id}")
def get_item(id: int):
    # FALSE-POSITIVE TRAP: Parameterized SQL query (SAFE, must not be flagged)
    conn = sqlite3.connect("store.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, price FROM items WHERE id = ?", (id,))
    item = cursor.fetchone()
    conn.close()
    return {"id": id, "item": item}

@router.get("")
def list_items():
    return [{"id": 1, "name": "Standard Laptop"}, {"id": 2, "name": "Wireless Mouse"}]
