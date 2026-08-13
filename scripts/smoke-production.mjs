const base = (process.env.SMOKE_BASE_URL || 'https://nutrikontur-consultant.onrender.com').replace(/\/$/, '');

const health = await getJson(`${base}/api/v1/health`);
if (health.status !== 'ok') throw new Error('Health check did not return ok');

const auth = await getJson(`${base}/api/v1/auth/config`);
if (auth.enabled !== true) throw new Error('OIDC is not enabled');
if (auth.redirect_uri !== `${base}/`) throw new Error('OIDC redirect URI does not match deployment URL');

const protectedResponse = await fetch(`${base}/api/v1/me`, { redirect: 'error' });
if (protectedResponse.status !== 401) throw new Error(`Protected endpoint returned ${protectedResponse.status} without a token`);

console.log('Production smoke test passed: health, public OIDC config, protected endpoint denial.');

async function getJson(url) {
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
