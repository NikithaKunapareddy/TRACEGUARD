"""Orders module with duplicate logic (slop)."""
def calculate_order_total(items):
    # SLOP: duplicated logic with billing module
    subtotal = sum(i.get('price', 0) * i.get('quantity', 1) for i in items)
    tax = subtotal * 0.08
    return subtotal + tax

def cancel_order(order_id):
    # SLOP: placeholder implementation
    pass
