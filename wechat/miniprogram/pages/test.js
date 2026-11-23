// Node 16+
const crypto = require('crypto');

const host = (process.env.QWEATHER_API_HOST || '')
  .replace(/^https?:\/\//, '').replace(/\/+$/, '');
const projectId = process.env.QWEATHER_PROJECT_ID;
const keyId = process.env.QWEATHER_KEY_ID;
const privateKey = (process.env.QWEATHER_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!host || !projectId || !keyId || !privateKey) {
  console.error('缺少 QWEATHER_API_HOST / PROJECT_ID / KEY_ID / PRIVATE_KEY');
  process.exit(1);
}

const b64url = (s) => Buffer.from(s).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const iat = Math.floor(Date.now() / 1000) - 30;
const header = { alg: 'Ed25519', kid: keyId };
const payload = { sub: projectId, iat, exp: iat + 3600 };
const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const signature = crypto.sign(null, Buffer.from(input), crypto.createPrivateKey(privateKey));

console.log(`${input}.${b64url(signature)}`);


