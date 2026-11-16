// 云函数：checkText — 文本内容安全检测
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { content } = event;

  if (!content || !String(content).trim()) {
    return { safe: true }; // 空文本无需检测
  }

  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: String(content).slice(0, 2500), // 接口限制长度
    });

    if (result.errCode === 0) {
      return { safe: true };
    }
    return {
      safe: false,
      errCode: result.errCode,
      errMsg: result.errMsg || '文本内容包含违规信息',
    };
  } catch (err) {
    console.error('文本检测失败:', err);
    if (err.errCode === 87014) {
      return { safe: false, errCode: 87014, errMsg: '文本内容包含违规信息' };
    }
    // 其他异常默认放行，避免影响正常使用，但记录日志
    return { safe: true, warning: '检测服务异常，已放行', error: err.message };
  }
};
