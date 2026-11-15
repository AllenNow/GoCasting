// 云函数：checkImage — 图片内容安全检测
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { fileID } = event;

  if (!fileID) {
    return { safe: false, error: '缺少 fileID 参数' };
  }

  try {
    // 1. 从云存储下载图片
    const fileRes = await cloud.downloadFile({ fileID });
    const buffer = fileRes.fileContent;

    // 2. 调用内容安全检测 API
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png',
        value: buffer,
      },
    });

    // errCode: 0 表示内容正常
    if (result.errCode === 0) {
      return { safe: true };
    } else {
      // 87014 = 内容含有违规信息
      return { 
        safe: false, 
        errCode: result.errCode,
        errMsg: result.errMsg || '图片内容不合规',
      };
    }
  } catch (err) {
    console.error('图片检测失败:', err);
    
    // 87014 = 内容含有违规信息
    if (err.errCode === 87014) {
      return { safe: false, errCode: 87014, errMsg: '图片内容不合规' };
    }
    
    // 其他错误，默认放行（避免影响正常使用），但记录日志
    return { safe: true, warning: '检测服务异常，已放行', error: err.message };
  }
};
