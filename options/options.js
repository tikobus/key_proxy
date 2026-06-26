/** 设置页：代理服务器、默认策略、黑白名单关键字的编辑与保存。 */

let config = null;

const els = {
  proxyType: document.getElementById("proxyType"),
  proxyHost: document.getElementById("proxyHost"),
  proxyPort: document.getElementById("proxyPort"),
  proxyUser: document.getElementById("proxyUser"),
  proxyPass: document.getElementById("proxyPass"),
  whitelist: document.getElementById("whitelist"),
  blacklist: document.getElementById("blacklist"),
  save: document.getElementById("save"),
  reset: document.getElementById("reset"),
  message: document.getElementById("message"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  config = await loadConfig();
  render(config);
  els.save.addEventListener("click", onSave);
  els.reset.addEventListener("click", onReset);
}

/** 将配置填充到表单。 */
function render(cfg) {
  els.proxyType.value = cfg.proxy.type;
  els.proxyHost.value = cfg.proxy.host;
  els.proxyPort.value = cfg.proxy.port;
  els.proxyUser.value = cfg.proxy.username;
  els.proxyPass.value = cfg.proxy.password;
  els.whitelist.value = cfg.whitelist.join("\n");
  els.blacklist.value = cfg.blacklist.join("\n");

  const radio = document.querySelector(
    `input[name="defaultPolicy"][value="${cfg.defaultPolicy}"]`
  );
  if (radio) radio.checked = true;
}

/** 从表单读取配置。保留已有 enabled 状态。 */
function collect() {
  const policyEl = document.querySelector('input[name="defaultPolicy"]:checked');
  return {
    enabled: config.enabled,
    defaultPolicy: policyEl ? policyEl.value : "direct",
    whitelist: textToList(els.whitelist.value),
    blacklist: textToList(els.blacklist.value),
    proxy: {
      type: els.proxyType.value,
      host: els.proxyHost.value,
      port: els.proxyPort.value,
      username: els.proxyUser.value,
      password: els.proxyPass.value,
    },
  };
}

/** 多行文本转关键字数组。 */
function textToList(text) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function onSave() {
  const draft = collect();

  // 基础校验：主机与端口
  if (!draft.proxy.host) {
    return showMessage("请填写代理主机", true);
  }
  const port = parseInt(draft.proxy.port, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return showMessage("端口需在 1-65535 之间", true);
  }

  config = await saveConfig(draft);
  render(config); // 回填规范化后的结果（去重、去空白）
  showMessage("已保存", false);
}

async function onReset() {
  config = await saveConfig(DEFAULT_CONFIG);
  render(config);
  showMessage("已重置为默认", false);
}

function showMessage(text, isError) {
  els.message.textContent = text;
  els.message.classList.toggle("error", Boolean(isError));
  if (!isError) {
    setTimeout(() => {
      els.message.textContent = "";
    }, 2000);
  }
}
