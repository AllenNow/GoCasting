// app.js
import { ENV_ID } from './utils/config';
import { getMe } from './utils/auth';
App({
    globalData: {
        user: null,
        permissions: {},
    },
    onLaunch() {
        if (!wx.cloud) {
            console.error('当前基础库版本过低，请使用 2.2.3 及以上版本');
            return;
        }
        if (ENV_ID) {
            wx.cloud.init({ env: ENV_ID, traceUser: true });
        }
        else {
            wx.cloud.init({ traceUser: true });
        }
        getMe().catch(() => {
            // 首次使用或未分配角色时静默失败，由页面引导初始化
        });
    },
});
