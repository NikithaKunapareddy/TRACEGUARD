const crypto = require('crypto');

// SECURITY VULNERABILITY: Hardcoded JWT secret key
const jwt_secret = "super_secret_production_key_12345";

function hashUserPassword(password) {
    // SECURITY VULNERABILITY: Weak MD5 cryptographic hashing for user credentials
    return crypto.createHash('md5').update(password).digest('hex');
}

function calculateFileChecksum(fileBuffer) {
    // FALSE-POSITIVE TRAP: Legitimate MD5 used for file cache checksum (Should NOT be flagged as credential weak crypto!)
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

module.exports = { jwt_secret, hashUserPassword, calculateFileChecksum };
