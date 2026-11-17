const express = require('express');
const router = express.Router();

router.get('/api/v1/health', (req, res) => {
    // FALSE-POSITIVE TRAP: Public health endpoint without auth (Should NOT be flagged as broken auth!)
    res.json({ status: "healthy" });
});

router.post('/api/v1/transactions', (req, res) => {
    // CODE SLOP: Swallowed exception with empty catch block
    try {
        processPayment(req.body);
    } catch (e) {
    }
    res.json({ received: true });
});

function safeHandler(data) {
    // FALSE-POSITIVE TRAP: Catch block that logs error properly (Should NOT be flagged!)
    try {
        parseData(data);
    } catch (err) {
        console.error("Failed to parse data:", err);
    }
}

module.exports = router;
