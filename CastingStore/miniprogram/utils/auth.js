import { call } from './api';
const STORAGE_KEY = 'casting_store_auth';
let cached = null;
let loading = null;
function readStorage() {
    const value = wx.getStorageSync(STORAGE_KEY);
    return value || null;
}
export function getMe(force = false) {
    if (!force && cached)
        return Promise.resolve(cached);
    if (!force && loading)
        return loading;
    loading = call('auth.me')
        .then((res) => {
        cached = res;
        wx.setStorageSync(STORAGE_KEY, res);
        const app = getApp();
        app.globalData.user = res.user;
        app.globalData.permissions = res.permissions || {};
        return res;
    })
        .catch((err) => {
        const local = readStorage();
        if (local) {
            cached = local;
            return local;
        }
        throw err;
    })
        .finally(() => {
        loading = null;
    });
    return loading;
}
export function clearAuth() {
    cached = null;
    wx.removeStorageSync(STORAGE_KEY);
    const app = getApp();
    app.globalData.user = null;
    app.globalData.permissions = {};
}
export function currentUser() {
    if (cached)
        return cached.user;
    const local = readStorage();
    return local ? local.user : null;
}
export function permissionMap() {
    if (cached)
        return cached.permissions || {};
    const local = readStorage();
    return local ? local.permissions || {} : {};
}
export function can(module, action) {
    const permissions = permissionMap();
    if (permissions['*'] && permissions['*'].indexOf('*') >= 0)
        return true;
    const actions = permissions[module];
    return !!actions && actions.indexOf(action) >= 0;
}
export async function bootstrap(name) {
    await call('init.setup', { name });
    clearAuth();
    await getMe(true);
}
