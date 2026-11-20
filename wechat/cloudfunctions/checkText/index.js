// 云函数：checkText — 文本内容安全检测
// 兼容说明：safe 字段保持旧版语义（异常时旧版仍视为通过）；
// 新版客户端通过 checked === false 识别“未完成检测”并拦截。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { content } = event;

  if (!content || !String(content).trim()) {
    return { safe: true, checked: true }; // 空文本无需检测
  }

  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: String(content).slice(0, 2500), // 接口限制长度
    });

    if (result.errCode === 0) {
      return { safe: true, checked: true };
    }
    if (result.errCode === 87014) {
      return { safe: false, checked: true, errCode: 87014, errMsg: '文本内容包含违规信息' };
    }
    // 非违规类错误（限频、服务异常等）：旧版按未通过处理，保持 safe:false
    return {
      safe: false,
      checked: false,
      retry: true,
      errCode: result.errCode,
      errMsg: '内容安全检测服务暂不可用，请稍后重试',
    };
  } catch (err) {
    console.error('文本检测失败:', err);
    if (err.errCode === 87014) {
      return { safe: false, checked: true, errCode: 87014, errMsg: '文本内容包含违规信息' };
    }
    // 兼容 1.0.0：基础设施异常沿用 safe:true 放行；新版客户端依据 checked:false 拦截
    return {
      safe: true,
      checked: false,
      retry: true,
      errMsg: '内容安全检测服务暂不可用，请稍后重试',
      error: err.message,
    };
  }
};
