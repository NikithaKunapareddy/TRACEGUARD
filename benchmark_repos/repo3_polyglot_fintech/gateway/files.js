const fs = require('fs');
const path = require('path');

function getDocument(req, res) {
    // SECURITY VULNERABILITY: Path traversal / Arbitrary file read
    const content = fs.readFileSync(path.join('/uploads', req.query.filename));
    res.send(content);
}

module.exports = { getDocument };
