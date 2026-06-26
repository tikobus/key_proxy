/**
 * 关键字匹配核心逻辑。
 *
 * 规则优先级（从高到低）：
 *   1. 域名包含白名单关键字 -> 直连（direct）
 *   2. 域名包含黑名单关键字 -> 走代理（proxy）
 *   3. 都不匹配             -> 默认策略（defaultPolicy）
 *
 * 该文件不依赖任何浏览器 API，便于在 background / popup / options 中复用，也便于单测。
 */

/**
 * 判断给定域名应走代理还是直连。
 *
 * @param {string} host - 请求域名（hostname）。
 * @param {object} config - 配置对象。
 * @param {string[]} config.whitelist - 白名单关键字数组。
 * @param {string[]} config.blacklist - 黑名单关键字数组。
 * @param {"direct"|"proxy"} config.defaultPolicy - 默认策略。
 * @returns {"direct"|"proxy"} 决策结果。
 */
function decide(host, config) {
  const h = String(host || "").toLowerCase();
  const whitelist = Array.isArray(config.whitelist) ? config.whitelist : [];
  const blacklist = Array.isArray(config.blacklist) ? config.blacklist : [];

  // 1. 白名单优先：命中即直连
  if (matchAny(h, whitelist)) return "direct";

  // 2. 黑名单：命中即走代理
  if (matchAny(h, blacklist)) return "proxy";

  // 3. 默认策略
  return config.defaultPolicy === "proxy" ? "proxy" : "direct";
}

/**
 * 判断域名是否包含关键字列表中的任意一个（子串匹配，忽略大小写）。
 * 空关键字会被忽略，避免空串命中所有域名。
 *
 * @param {string} host - 已转小写的域名。
 * @param {string[]} keywords - 关键字数组。
 * @returns {boolean}
 */
function matchAny(host, keywords) {
  for (const raw of keywords) {
    const k = String(raw || "").trim().toLowerCase();
    if (k && host.includes(k)) return true;
  }
  return false;
}

// 同时支持浏览器全局环境与 Node（单测）环境。
if (typeof module !== "undefined" && module.exports) {
  module.exports = { decide, matchAny };
}
