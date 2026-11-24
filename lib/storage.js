/**
 * 配置存储封装。
 * 统一管理默认配置、读取、写入、规范化，供 background / popup / options 复用。
 */

/** 单个代理服务器的字段模板 */
const DEFAULT_PROXY = {
  type: "http", // "http" | "https" | "socks" | "socks4"
  host: "127.0.0.1",
  port: 7890,
  username: "",
  password: "",
};

/** 默认配置 */
const DEFAULT_CONFIG = {
  enabled: false, // 代理总开关，默认关闭
  defaultPolicy: "direct", // 默认策略："direct" | "proxy"
  whitelist: [], // 白名单关键字
  blacklist: [], // 黑名单关键字
  proxies: [
    {
      id: "default",
      name: "默认服务器",
      type: DEFAULT_PROXY.type,
      host: DEFAULT_PROXY.host,
      port: DEFAULT_PROXY.port,
      username: "",
      password: "",
    },
  ],
  activeProxyId: "default", // 当前生效的代理服务器 id
};

/**
 * 读取完整配置，缺失字段用默认值补齐。
 * 兼容旧版单代理配置（proxy 对象），自动迁移为 proxies 列表。
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
 * 一键切换当前使用的代理服务器。
 * 仅写入 activeProxyId，避免规范化页面中尚未保存的草稿。
 * @param {string} id - 目标代理服务器 id。
 * @returns {Promise<object>} 更新后的完整配置。
 */
async function saveActiveProxyId(id) {
  const config = await loadConfig();
  const target = String(id || "").trim();
  if (
    config.activeProxyId === target ||
    !config.proxies.some((p) => p.id === target)
  ) {
    return config;
  }
  await browser.storage.local.set({ activeProxyId: target });
  config.activeProxyId = target;
  return config;
}

/**
 * 仅持久化 activeProxyId，不重载、不规范化其它字段。
 * 供 options 页在保留表单草稿的同时一键切换；后台仍会通过 onChanged 热更新。
 * @param {string} id - 目标代理服务器 id。
 */
async function persistActiveProxyId(id) {
  await browser.storage.local.set({ activeProxyId: String(id || "").trim() });
}

/**
 * 获取当前生效的代理服务器对象。
 * @param {object} config
 * @returns {object|null} 不存在时返回 null。
 */
function getActiveProxy(config) {
  if (!config || !Array.isArray(config.proxies)) return null;
  return config.proxies.find((p) => p.id === config.activeProxyId) || null;
}

/**
 * 将任意输入规范化为完整、类型正确的配置对象。
 * 旧版数据（单个 proxy 对象）在此自动迁移为 proxies 列表的第一项。
 * @param {object} input
 * @returns {object}
 */
function normalizeConfig(input) {
  const src = input && typeof input === "object" ? input : {};

  // 优先取新版 proxies 列表；否则从旧版单个 proxy 对象迁移；
  // 显式传入空列表（用户删光了）则保留为空；全新安装（空 storage）预置默认服务器。
  let proxiesSrc;
  if (Array.isArray(src.proxies)) {
    proxiesSrc = src.proxies;
  } else if (src.proxy && typeof src.proxy === "object") {
    proxiesSrc = [src.proxy];
  } else if (!("proxies" in src)) {
    proxiesSrc = DEFAULT_CONFIG.proxies;
  } else {
    proxiesSrc = [];
  }

  const proxies = proxiesSrc.map((p) => normalizeProxyEntry(p));

  // activeProxyId 必须指向真实存在的条目，否则回退到第一项（可能为空串）。
  let activeProxyId = String(src.activeProxyId || "").trim();
  if (!proxies.some((p) => p.id === activeProxyId)) {
    activeProxyId = proxies.length > 0 ? proxies[0].id : "";
  }

  return {
    enabled: Boolean(src.enabled),
    defaultPolicy: src.defaultPolicy === "proxy" ? "proxy" : "direct",
    whitelist: cleanKeywords(src.whitelist),
    blacklist: cleanKeywords(src.blacklist),
    proxies,
    activeProxyId,
  };
}

/** 生成代理服务器条目的唯一 id。 */
function generateProxyId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 规范化单个代理服务器条目，补齐缺失字段。 */
function normalizeProxyEntry(entry) {
  const src = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(src.id || "").trim() || generateProxyId(),
    name: String(src.name || "").trim() || "未命名服务器",
    type: normalizeProxyType(src.type),
    host: String(src.host || DEFAULT_PROXY.host).trim(),
    port: normalizePort(src.port),
    username: String(src.username || "").trim(),
    password: String(src.password || ""),
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
  return DEFAULT_PROXY.port;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_CONFIG,
    DEFAULT_PROXY,
    loadConfig,
    saveConfig,
    saveActiveProxyId,
    getActiveProxy,
    normalizeConfig,
    normalizeProxyEntry,
    cleanKeywords,
    generateProxyId,
    persistActiveProxyId,
  };
}
