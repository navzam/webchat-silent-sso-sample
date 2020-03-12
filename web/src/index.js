require('dotenv').config();

// Setting default environment variables
process.env = {
    PORT: '5000',
    STATIC_FILES: 'public',
    OAUTH_METADATA_ENDPOINT: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    ...process.env,
};

const { join } = require('path');
const restify = require('restify');
const passport = require('passport');
const { BearerStrategy } = require('passport-azure-ad');

const server = restify.createServer();
const { STATIC_FILES, PORT, OAUTH_CLIENT_ID, TENANT_ID, OAUTH_METADATA_ENDPOINT } = process.env;

server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());


// Set up the passport authentication strategy
var bearerStrategy = new BearerStrategy({
    identityMetadata: OAUTH_METADATA_ENDPOINT,
    clientID: OAUTH_CLIENT_ID,
    validateIssuer: true, // disable to allow any tenant
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
}, (token, done) => {
    console.info(`the token retrieved is ${token}`);
    const user = {
        id: token.sub,
        name: token.name,
        upn: token.preferred_name,
    };
    return done(null, user, token);
});
passport.use(bearerStrategy);

// Route for getting a DirectLine token
// Protected using Passport, which will validate the incoming token
server.post('/api/directline/token',
    passport.authenticate('oauth-bearer', { session: false }),
    require('./routes/directLine/token')
);

// We will use the REST API server to serve static web content to simplify demployment for demonstration purposes
if (STATIC_FILES) {
    server.get('/**/*', restify.plugins.serveStatic({
        default: 'index.html',
        directory: join(__dirname, '..', STATIC_FILES),
    }));
}

server.listen(PORT, () => {
    if (STATIC_FILES) {
        console.log(`Will serve static content from ${STATIC_FILES}`);
    }

    console.log(`REST API server is listening to port ${PORT}`);
});