const fetchJSON = require('../utils/fetchJSON');

async function generateDirectLineToken(secret, userId) {
    const directLineResponse = await fetchJSON('https://directline.botframework.com/v3/directline/tokens/generate', {
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            User: { Id: userId },
        }),
    });

    return directLineResponse.token;
}

const { DIRECT_LINE_SECRET } = process.env;

// GET /api/directline/token
// Generates a new Direct Line token
module.exports = async (req, res, next) => {
    // Incoming ID token has already been validated by Passport
    // Get user ID from resulting user object
    const userId = req.user.id;

    console.log(`Getting DirectLine token for user ID ${userId}`);
    const directLineToken = await generateDirectLineToken(DIRECT_LINE_SECRET, userId);
    res.json({ token: directLineToken });
};