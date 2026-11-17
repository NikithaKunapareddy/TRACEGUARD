"""Core domain utilities."""
# LOOSE_END: Hardcoded JWT secret
APP_SECRET = "super_secret_monolith_token_key_2026"

def generate_auth_header(user_id: int) -> dict:
    return {"Authorization": f"Bearer {APP_SECRET}:{user_id}"}
