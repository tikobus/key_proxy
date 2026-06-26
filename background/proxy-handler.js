/**
 * 后台核心：注册 proxy.onRequest，按关键字规则动态决定每个请求走代理还是直连。
 * 依赖（按 manifest 中声明顺序加载）：lib/matcher.js、lib/storage.js。
 */

// 内存缓存配置。proxy.onRequest 在每个请求触发，必须用缓存避免频繁读 storage。
let config = null;

/** 初始化：从存储载入配置到内存缓存。 */
async function init() {
  config = await loadConfig();
  updateBadge();
}

/**
 * 代理决策回调。返回直连或代理信息对象。
 * @param {object} requestInfo - 包含请求 url 等信息。
 */
function handleRequest(requestInfo) {
  // 配置未就绪或总开关关闭：一律直连。
  if (!config || !config.enabled) {
    return { type: "direct" };
  }

  let host;
  try {
    host = new URL(requestInfo.url).hostname;
  } catch (e) {
    return { type: "direct" };
  }

  const action = decide(host, config);
  if (action === "direct") {
    return { type: "direct" };
  }

  return buildProxyInfo(config.proxy);
}

/**
 * 根据代理配置构造 proxy.onRequest 所需的返回对象。
 * @param {object} proxy
 */
function buildProxyInfo(proxy) {
  const info = {
    type: proxy.type,
    host: proxy.host,
    port: proxy.port,
  };
  // 仅 HTTP/HTTPS 代理在此处直接带认证；SOCKS 认证由 onAuthRequired 处理。
  if (proxy.username && (proxy.type === "http" || proxy.type === "https")) {
    info.proxyAuthorizationHeader =
      "Basic " + btoa(`${proxy.username}:${proxy.password}`);
  }
  return info;
}

/** 在工具栏图标上显示开关状态。 */
function updateBadge() {
  const on = config && config.enabled;
  browser.browserAction.setBadgeText({ text: on ? "ON" : "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "#2b8a3e" });
}

/**
 * 处理需要认证的代理（HTTP/HTTPS/SOCKS 认证弹窗）。
 * @param {object} details
 */
function handleAuthRequired(details) {
  if (!config || !config.enabled || !details.isProxy) {
    return {};
  }
  const { username, password } = config.proxy;
  if (username) {
    return { authCredentials: { username, password } };
  }
  return {};
}

// 注册代理决策监听器。
browser.proxy.onRequest.addListener(handleRequest, { urls: ["<all_urls>"] });

// 注册代理认证监听器。
browser.webRequest.onAuthRequired.addListener(
  handleAuthRequired,
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// 监听存储变化，热更新内存缓存（popup/options 修改配置后立即生效）。
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    init();
  }
});

// 可选：监听代理错误，便于排查。
if (browser.proxy.onError) {
  browser.proxy.onError.addListener((error) => {
    console.error("[proxy error]", error.message);
  });
}

init();
