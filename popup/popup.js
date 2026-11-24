/** Popup：快速开关、默认策略切换、代理服务器一键切换。 */

let config = null;

const enabledEl = document.getElementById("enabled");
const policyEl = document.getElementById("defaultPolicy");
const proxySwitcherEl = document.getElementById("proxySwitcher");
const statusEl = document.getElementById("proxyStatus");
const openOptionsEl = document.getElementById("openOptions");

const PROXY_TYPE_LABELS = {
  http: "HTTP",
  https: "HTTPS",
  socks: "SOCKS5",
  socks4: "SOCKS4",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  config = await loadConfig();
  render();
  bindEvents();
}

/** 根据当前配置刷新界面。 */
function render() {
  enabledEl.checked = config.enabled;
  updatePolicyButtons();
  renderProxySwitcher();
  updateStatus();
}

/** 高亮当前默认策略按钮。 */
function updatePolicyButtons() {
  for (const btn of policyEl.querySelectorAll(".seg-btn")) {
    btn.classList.toggle("active", btn.dataset.value === config.defaultPolicy);
  }
}

/** 渲染代理服务器切换列表。 */
function renderProxySwitcher() {
  proxySwitcherEl.innerHTML = "";
  if (config.proxies.length === 0) {
    const empty = document.createElement("div");
    empty.className = "proxy-empty";
    empty.textContent = "暂无服务器，请在设置页添加";
    proxySwitcherEl.appendChild(empty);
    return;
  }
  for (const p of config.proxies) {
    const type = PROXY_TYPE_LABELS[p.type] || p.type;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "proxy-item" + (p.id === config.activeProxyId ? " active" : "");
    btn.dataset.id = p.id;
    btn.title = "点击切换";

    const main = document.createElement("span");
    main.className = "proxy-item-main";

    const name = document.createElement("span");
    name.className = "proxy-name";
    name.textContent = p.name;

    const addr = document.createElement("span");
    addr.className = "proxy-addr";
    addr.textContent = `${type} · ${p.host}:${p.port}`;

    const dot = document.createElement("span");
    dot.className = "dot";

    main.append(name, addr);
    btn.append(main, dot);
    proxySwitcherEl.appendChild(btn);
  }
}

/** 显示当前使用的代理服务器信息。 */
function updateStatus() {
  const p = getActiveProxy(config);
  if (p) {
    const type = PROXY_TYPE_LABELS[p.type] || p.type;
    statusEl.textContent = `当前使用：${p.name}（${type}://${p.host}:${p.port}）`;
  } else {
    statusEl.textContent = "代理服务器：未配置";
  }
}

function bindEvents() {
  // 总开关
  enabledEl.addEventListener("change", async () => {
    config.enabled = enabledEl.checked;
    config = await saveConfig(config);
  });

  // 默认策略切换
  policyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    config.defaultPolicy = btn.dataset.value;
    updatePolicyButtons();
    config = await saveConfig(config);
  });

  // 代理服务器一键切换
  proxySwitcherEl.addEventListener("click", async (e) => {
    const item = e.target.closest(".proxy-item");
    if (!item) return;
    const id = item.dataset.id;
    if (!id || id === config.activeProxyId) return;
    config = await saveActiveProxyId(id);
    renderProxySwitcher();
    updateStatus();
  });

  // 打开设置页
  openOptionsEl.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}
