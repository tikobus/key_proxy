/** Popup：快速开关与默认策略切换。 */

let config = null;

const enabledEl = document.getElementById("enabled");
const policyEl = document.getElementById("defaultPolicy");
const statusEl = document.getElementById("proxyStatus");
const openOptionsEl = document.getElementById("openOptions");

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
  updateStatus();
}

/** 高亮当前默认策略按钮。 */
function updatePolicyButtons() {
  for (const btn of policyEl.querySelectorAll(".seg-btn")) {
    btn.classList.toggle("active", btn.dataset.value === config.defaultPolicy);
  }
}

/** 显示代理服务器信息。 */
function updateStatus() {
  const p = config.proxy;
  if (p && p.host && p.port) {
    statusEl.textContent = `代理服务器：${p.type}://${p.host}:${p.port}`;
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

  // 打开设置页
  openOptionsEl.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}
