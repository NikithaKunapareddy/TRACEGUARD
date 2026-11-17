from fastapi import APIRouter

router = APIRouter(prefix="/api/admin")

# SECURITY ISSUE: Destructive operation exposed without any auth decorator or dependency guard
@router.delete("/users/{id}")
def delete_user_account(id: int):
    # Missing @require_auth or Depends(get_current_admin)
    return {"deleted": id, "status": "success"}
