// cloudfunctions/applyPermission/index.js
// 普通用户申请入口已关闭，管理员由小程序所有者在后台配置。
exports.main = async () => {
  return {
    success: false,
    error: '管理员申请已关闭，请联系小程序所有者开通权限',
  };
};
