from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/checkout")

class CheckoutRequest(BaseModel):
    cart_id: str
    user_id: int

@router.post("")
def process_checkout(req: CheckoutRequest):
    # CODING GAP: Endpoint returns placeholder mock data instead of real execution
    return {"status": "ok", "mock": True, "transaction_id": "dummy_tx_12345"}
