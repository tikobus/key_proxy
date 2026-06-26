/**
 * 配置存储封装。
 * 统一管理默认配置、读取、写入、规范化，供 background / popup / options 复用。
 */

/** 默认配置 */
const DEFAULT_CONFIG = {
  enabled: false, // 代理总开关，默认关闭
  defaultPolicy: "direct", // 默认策略："direct" | "proxy"
  whitelist: [], // 白名单关键字
  blacklist: [], // 黑名单关键字
  proxy: {
    type: "http", // "http" | "https" | "socks" | "socks4"
    host: "127.0.0.1",
    port: 7890,
    username: "",
    password: "",
  },
};

/**
 * 读取完整配置，缺失字段用默认值补齐。
 * @returns {Promise<object>}
 */
async function loadConfig() {
  const stored = await browser.storage.local.get(null);
  return normalizeConfig(stored);
}

/**
 * 保存配置（写入前先规范化）。
 * @param {object} config
 * @returns {Promise<object>} 规范化后的配置。
 */
async function saveConfig(config) {
  const normalized = normalizeConfig(config);
  await browser.storage.local.set(normalized);
  return normalized;
}

/**
 * 将任意输入规范化为完整、类型正确的配置对象。
 * @param {object} input
 * @returns {object}
 */
function normalizeConfig(input) {
  const src = input && typeof input === "object" ? input : {};
  const proxySrc = src.proxy && typeof src.proxy === "object" ? src.proxy : {};

  return {
    enabled: Boolean(src.enabled),
    defaultPolicy: src.defaultPolicy === "proxy" ? "proxy" : "direct",
    whitelist: cleanKeywords(src.whitelist),
    blacklist: cleanKeywords(src.blacklist),
    proxy: {
      type: normalizeProxyType(proxySrc.type),
      host: String(proxySrc.host || DEFAULT_CONFIG.proxy.host).trim(),
      port: normalizePort(proxySrc.port),
      username: String(proxySrc.username || "").trim(),
      password: String(proxySrc.password || ""),
    },
  };
}

/** 关键字数组去空白、去空项、去重。 */
function cleanKeywords(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const k = String(item || "").trim();
    if (k && !seen.has(k.toLowerCase())) {
      seen.add(k.toLowerCase());
      result.push(k);
    }
  }
  return result;
}

/** 校验代理类型，非法时回退 http。 */
function normalizeProxyType(type) {
  const allowed = ["http", "https", "socks", "socks4"];
  return allowed.includes(type) ? type : "http";
}

/** 校验端口范围，非法时回退默认端口。 */
function normalizePort(port) {
  const n = parseInt(port, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 65535) return n;
  return DEFAULT_CONFIG.proxy.port;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_CONFIG,
    loadConfig,
    saveConfig,
    normalizeConfig,
    cleanKeywords,
  };
}
