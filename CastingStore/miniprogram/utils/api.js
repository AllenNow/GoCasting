import { CLOUD_FUNCTION } from './config';
export class ApiError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export async function call(action, payload = {}) {
    if (!wx.cloud) {
        throw new ApiError(-1, '当前微信版本不支持云开发');
    }
    const res = await wx.cloud.callFunction({
        name: CLOUD_FUNCTION,
        data: { action, payload },
    });
    const result = res.result;
    if (!result) {
        throw new ApiError(-1, '云函数无返回，请检查云函数是否已部署');
    }
    if (result.code !== 0) {
        throw new ApiError(result.code, result.message || '请求失败');
    }
    return result.data;
}
export function toastError(err) {
    const message = err instanceof Error ? err.message : '操作失败';
    wx.showToast({ title: message, icon: 'none', duration: 2500 });
}
