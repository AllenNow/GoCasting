export function toast(title, icon = 'none') {
    wx.showToast({ title, icon, duration: 2000 });
}
export function confirm(title, content) {
    return new Promise((resolve) => {
        wx.showModal({
            title,
            content,
            success: (res) => resolve(!!res.confirm),
            fail: () => resolve(false),
        });
    });
}
export function prompt(title, placeholder = '') {
    return new Promise((resolve) => {
        wx.showModal({
            title,
            editable: true,
            placeholderText: placeholder,
            success: (res) => resolve(res.confirm ? String(res.content || '') : null),
            fail: () => resolve(null),
        });
    });
}
export function nav(url) {
    wx.navigateTo({ url });
}
export function switchTab(url) {
    wx.switchTab({ url });
}
export function back() {
    wx.navigateBack({ delta: 1 });
}
