// 云函数：checkImage — 图片内容安全检测
// 兼容说明：safe 字段保持旧版语义（异常时旧版仍视为通过）；
// 新版客户端通过 checked === false 识别“未完成检测”并拦截。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { fileID } = event;

  if (!fileID) {
    return { safe: false, checked: false, retry: true, errMsg: '缺少 fileID 参数' };
  }

  try {
    // 1. 从云存储下载图片
    const fileRes = await cloud.downloadFile({ fileID });
    const buffer = fileRes.fileContent;

    if (!buffer || !buffer.length) {
      return { safe: true, checked: false, retry: true, errMsg: '图片读取失败，请重试' };
    }

    // imgSecCheck 限制 1MB；旧版需继续放行，新版通过 checked:false 拦截
    if (buffer.length > 1024 * 1024) {
      return {
        safe: true,
        checked: false,
        tooLarge: true,
        retry: true,
        errMsg: '图片超过 1MB，请压缩后重试',
      };
    }

    // 2. 调用内容安全检测 API（按文件扩展名声明类型，避免 JPEG 被当作 PNG 导致检测失败）
    const isPng = /\.png$/i.test(fileID);
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: isPng ? 'image/png' : 'image/jpeg',
        value: buffer,
      },
    });

    // errCode: 0 表示内容正常
    if (result.errCode === 0) {
      return { safe: true, checked: true };
    }
    // 87014 = 内容含有违规信息
    if (result.errCode === 87014) {
      return { safe: false, checked: true, errCode: 87014, errMsg: '图片内容不合规' };
    }
    // 非违规类错误（限频、服务异常等）：旧版按未通过处理，保持 safe:false
    return {
      safe: false,
      checked: false,
      retry: true,
      errCode: result.errCode,
      errMsg: '图片安全检测服务暂不可用，请稍后重试',
    };
  } catch (err) {
    console.error('图片检测失败:', err);

    // 87014 = 内容含有违规信息
    if (err.errCode === 87014) {
      return { safe: false, checked: true, errCode: 87014, errMsg: '图片内容不合规' };
    }

    // 兼容 1.0.0：基础设施异常沿用 safe:true 放行；新版客户端依据 checked:false 拦截
    return {
      safe: true,
      checked: false,
      retry: true,
      errMsg: '图片安全检测服务暂不可用，请稍后重试',
      error: err.message,
    };
  }
};
