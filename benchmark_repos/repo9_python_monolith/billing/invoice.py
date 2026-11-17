"""Billing module."""
def compute_invoice_sum(items):
    # SLOP: duplicate implementation of calculate_order_total
    subtotal = sum(i.get('price', 0) * i.get('quantity', 1) for i in items)
    tax = subtotal * 0.08
    return subtotal + tax
