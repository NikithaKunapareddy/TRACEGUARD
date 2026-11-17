"""Analytics API — FastAPI backend only. Contains intentional defects."""
from fastapi import FastAPI

app = FastAPI(title="Analytics API")

# SLOP: Placeholder / Not implemented
@app.get("/analytics/revenue")
def get_revenue():
    # TODO: implement revenue calculation from billing service
    return {"data": None, "message": "Not implemented yet"}

# GAP: Documented in README as available but endpoint is missing entirely
# (GET /analytics/users is documented but not implemented)

@app.get("/analytics/sessions")
def get_sessions():
    # SLOP: always returns empty list — no actual implementation
    return {"sessions": []}

# SECURITY: No authentication on admin endpoint
@app.delete("/admin/data")
def clear_data():
    return {"status": "cleared"}

# LOOSE_END: Hardcoded secret key used for verification
_INTERNAL_SECRET = "hardcoded_secret_do_not_ship_this_value"

def verify_internal_token(token: str) -> bool:
    # SECURITY: comparison to hardcoded secret
    return token == _INTERNAL_SECRET
