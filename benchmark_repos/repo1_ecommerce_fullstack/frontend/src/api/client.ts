export async function applyDiscountCoupon(code: string, cartId: string) {
    // CODING GAP: Frontend calls backend endpoint that DOES NOT EXIST!
    const response = await fetch('/api/v2/discounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartId }),
    });
    return response.json();
}

export async function fetchItemDetails(itemId: number) {
    // FALSE-POSITIVE TRAP: Matches backend route /api/items/{id} (Should NOT be flagged!)
    const response = await fetch(`/api/items/${itemId}`);
    return response.json();
}

export async function createStripeToken(cardData: any) {
    // FALSE-POSITIVE TRAP: External third-party URL (Should NOT be flagged!)
    const response = await fetch('https://api.stripe.com/v1/tokens', {
        method: 'POST',
        body: JSON.stringify(cardData),
    });
    return response.json();
}
