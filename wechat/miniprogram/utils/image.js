// utils/image.js — 图片压缩与大小探测（内容安全检测前使用）
const MAX_IMAGE_BYTES = 950 * 1024; // 留出余量，微信 imgSecCheck 限制为 1MB

function getFileSize(filePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    if (fs && fs.getFileInfo) {
      fs.getFileInfo({
        filePath,
        success: (res) => resolve(res.size),
        fail: reject,
      });
      return;
    }
    wx.getFileInfo({
      filePath,
      success: (res) => resolve(res.size),
      fail: reject,
    });
  });
}

function compressOnce(src, quality) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    });
  });
}

// 逐档压缩，直到小于 limit；无法压缩时返回原图，由调用方决定是否拦截
async function compressImageToLimit(srcPath, limit = MAX_IMAGE_BYTES) {
  let size = 0;
  try {
    size = await getFileSize(srcPath);
  } catch (e) {}
  if (size && size <= limit) return srcPath;

  let current = srcPath;
  const qualities = [80, 60, 40, 20];
  for (let i = 0; i < qualities.length; i++) {
    try {
      current = await compressOnce(current, qualities[i]);
      const nextSize = await getFileSize(current);
      if (nextSize <= limit) return current;
    } catch (e) {
      break; // 不支持压缩的格式（如部分 png）直接返回原图
    }
  }
  return current;
}

module.exports = {
  MAX_IMAGE_BYTES,
  getFileSize,
  compressImageToLimit,
};
