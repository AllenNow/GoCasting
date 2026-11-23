// cloudfunctions/getWeatherExtra/qweather.js
// 和风天气鉴权与请求封装（JWT / API KEY 二选一）
// 与 getMarineData/qweather-tide.js 保持相同的环境变量约定

const crypto = require('crypto');
const fetch  = require('node-fetch');

// 环境变量里的私钥常见问题：换行丢失/被引号包裹/END 与正文粘连/CRLF 混合，
// 统一还原成标准 PEM（每行 64 字符），避免 crypto 报 "bad end line"
function normalizePrivateKey(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/^['"`]+/, '').replace(/['"`]+$/, '');
  s = s.replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');
  const m = s.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return s;
  const body = m[2].replace(/[^A-Za-z0-9+/=]/g, '');
  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${m[1]}-----\n${lines.join('\n')}\n-----END ${m[1]}-----\n`;
}

function readConfig() {
  const host = (process.env.QWEATHER_API_HOST || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (!host) return null;

  const privateKey  = normalizePrivateKey(process.env.QWEATHER_PRIVATE_KEY);
  const projectId   = (process.env.QWEATHER_PROJECT_ID || '').trim();
  const keyId       = (process.env.QWEATHER_KEY_ID || '').trim();
  const developerId = (process.env.QWEATHER_DEVELOPER_ID || '').trim();

  if (privateKey && projectId && keyId) {
    return { host, mode: 'jwt', privateKey, projectId, keyId, developerId };
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
  // 和风 JWT 规范：alg 必须为 EdDSA，payload 需要 iss（开发者 ID），有效期 15 分钟
  if (!cfg.developerId) {
    console.warn('[qweather] 缺少 QWEATHER_DEVELOPER_ID，JWT 可能被拒绝');
  }
  const header  = { alg: 'EdDSA', kid: cfg.keyId };
  const payload = { iss: cfg.developerId, sub: cfg.projectId, iat, exp: iat + 900 };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`;
  let key;
  try {
    key = crypto.createPrivateKey(cfg.privateKey);
  } catch (e) {
    // 只输出结构信息，不输出私钥内容，便于判断是格式问题还是粘贴不完整
    const k = String(cfg.privateKey || '');
    const diag = `len=${k.length},BEGIN=${k.includes('-----BEGIN')},END=${k.includes('-----END')},lines=${k.split('\n').length}`;
    throw new Error(`QWEATHER_PRIVATE_KEY 无法解析（${e.message}；${diag}）：请确认环境变量含完整的 BEGIN/END 私钥`);
  }
  const signature = crypto.sign(null, Buffer.from(signingInput), key);
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
