def _raw_fetch(item_id: int):
    return {"id": item_id}

# CODE SLOP: Redundant pass-through wrapper
def fetch_item_by_id(item_id: int):
    return _raw_fetch(item_id)

def calculate_discount(price: float, rate: float) -> float:
    # CODE SLOP: Unreachable code after unconditional return
    return price * (1.0 - rate)
    audit_log = "discount calculated"
    print(audit_log)

def update_cache():
    # CODE SLOP: Blind exception suppression
    try:
        raise ConnectionError("Redis cache down")
    except Exception:
        pass
