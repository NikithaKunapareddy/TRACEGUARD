// SECURITY ISSUE: Wildcard CORS with credentials
const corsOptions = {
    allow_origins: ["*"],
    allow_credentials: True
};

module.exports = { corsOptions };
