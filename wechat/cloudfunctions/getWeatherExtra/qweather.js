// cloudfunctions/getWeatherExtra/qweather.js
// 和风天气鉴权与请求封装（JWT / API KEY 二选一）
// 与 getMarineData/qweather-tide.js 保持相同的环境变量约定

const crypto = require('crypto');
const fetch  = require('node-fetch');

function readConfig() {
  const host = (process.env.QWEATHER_API_HOST || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (!host) return null;

  const privateKey = (process.env.QWEATHER_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  const projectId  = (process.env.QWEATHER_PROJECT_ID || '').trim();
  const keyId      = (process.env.QWEATHER_KEY_ID || '').trim();

  if (privateKey && projectId && keyId) {
    return { host, mode: 'jwt', privateKey, projectId, keyId };
  }

  const apiKey = (process.env.QWEATHER_API_KEY || '').trim();
  if (apiKey) return { host, mode: 'key', apiKey };

  return null;
}

function b64url(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signJwt(cfg) {
  const iat = Math.floor(Date.now() / 1000) - 30;
  const header  = { alg: 'Ed25519', kid: cfg.keyId };
  const payload = { sub: cfg.projectId, iat, exp: iat + 3600 };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`;
  const signature = crypto.sign(null, Buffer.from(signingInput), crypto.createPrivateKey(cfg.privateKey));
  return `${signingInput}.${b64url(signature)}`;
}

async function apiGet(cfg, path) {
  let url = `https://${cfg.host}${path}`;
  const headers = {};
  if (cfg.mode === 'jwt') {
    headers.Authorization = `Bearer ${signJwt(cfg)}`;
  } else {
    url += `${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(cfg.apiKey)}`;
  }

  const resp = await fetch(url, { headers, timeout: 8000 });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`QWeather 返回非 JSON（HTTP ${resp.status}）: ${text.slice(0, 120)}`);
  }
  if (!resp.ok) {
    const msg = (json && json.error && json.error.message) || text.slice(0, 120);
    throw new Error(`QWeather HTTP ${resp.status}: ${msg}`);
  }
  // 204 = 该地区无数据，属于正常空结果
  if (json.code && json.code !== '200' && json.code !== '204') {
    throw new Error(`QWeather code ${json.code}: ${json.message || '请求失败'}`);
  }
  return json;
}

module.exports = { readConfig, apiGet };
