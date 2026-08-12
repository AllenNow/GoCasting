// utils/format.js — 全局格式化工具函数

/**
 * 格式化鱼获重量
 * @param {number|null} g 克数
 * @returns {string} '1.5 kg' 或 '800 g' 或 ''
 */
function formatWeight(g) {
  if (!g) return '';
  return g >= 1000 ? (g / 1000).toFixed(1) + ' kg' : g + ' g';
}

/**
 * 日期字符串转友好显示（YYYY-MM-DD → M月D日）
 * @param {string} dateStr
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}

/**
 * 价格千分位格式化
 * @param {number} price
 */
function formatPrice(price) {
  if (!price && price !== 0) return '-';
  const str = '' + price;
  let result = '';
  let count = 0;
  let i = str.length - 1;
  while (i >= 0) {
    result = str[i] + result;
    count++;
    if (count % 3 === 0 && i > 0) result = ',' + result;
    i--;
  }
  return result;
}

module.exports = { formatWeight, formatDate, formatPrice };
