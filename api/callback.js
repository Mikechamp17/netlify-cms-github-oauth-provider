// Exchange GitHub code for access token and return to Decap CMS
module.exports = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      return res.status(401).send(`OAuth error: ${data.error_description || 'no token returned'}`);
    }

    // Safely embed the payload into the page using JSON.stringify
    const payload = JSON.stringify({
      token: data.access_token,
      provider: 'github',
    });

    // Decap CMS opens this page in a popup and listens for postMessage
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!doctype html><html><body><script>
      (function() {
        var payload = ${JSON.stringify(payload)};
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:success:' + payload,
            e.origin
          );
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    <\/script></body></html>`);
  } catch (err) {
    res.status(500).send('OAuth callback error: ' + err.message);
  }
};
