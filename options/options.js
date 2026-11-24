/**
 * 设置页：多代理服务器管理（新增 / 删除 / 编辑 / 一键切换）、默认策略、黑白名单关键字。
 *
 * 数据流：
 *  - 列表项点击 -> 立即写入 activeProxyId（后台热更新，立即生效）
 *  - 表单编辑   -> 实时同步到内存草稿，点击「保存」时统一校验并持久化
 */

let config = null;
let editingId = ""; // 当前在右侧表单中编辑的服务器 id

const els = {
  proxyList: document.getElementById("proxyList"),
  addProxy: document.getElementById("addProxy"),
  deleteProxy: document.getElementById("deleteProxy"),
  proxyName: document.getElementById("proxyName"),
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

const PROXY_TYPE_LABELS = {
  http: "HTTP",
  https: "HTTPS",
  socks: "SOCKS5",
  socks4: "SOCKS4",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  config = await loadConfig();
  editingId = config.activeProxyId;
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.save.addEventListener("click", onSave);
  els.reset.addEventListener("click", onReset);
  els.addProxy.addEventListener("click", onAddProxy);
  els.deleteProxy.addEventListener("click", onDeleteProxy);

  // 一键切换：点击列表项立即切换当前使用的服务器
  els.proxyList.addEventListener("click", onListClick);

  // 表单输入实时同步到内存草稿，切换编辑对象时避免丢失未保存内容
  for (const input of [
    els.proxyName,
    els.proxyType,
    els.proxyHost,
    els.proxyPort,
    els.proxyUser,
    els.proxyPass,
  ]) {
    input.addEventListener("input", syncFormToDraft);
    input.addEventListener("change", syncFormToDraft);
  }
}

/** 点击列表项：一键切换 + 加载到编辑表单。 */
async function onListClick(e) {
  const item = e.target.closest(".proxy-item");
  if (!item) return;
  const id = item.dataset.id;
  if (!id) return;

  syncFormToDraft(); // 先把当前表单内容写回草稿，避免丢编辑
  editingId = id;
  if (config.activeProxyId !== id) {
    // 仅写入 activeProxyId，保留内存中尚未保存的表单草稿；后台通过 onChanged 热更新
    await persistActiveProxyId(id);
    config.activeProxyId = id;
    showMessage(`已切换到「${findProxy(id)?.name || ""}」`, false);
  }
  renderAll();
}

/** 新增服务器：加入列表并进入编辑（不自动启用）。 */
async function onAddProxy() {
  syncFormToDraft();
  config.proxies.push({
    id: generateProxyId(),
    name: `服务器 ${config.proxies.length + 1}`,
    type: "http",
    host: DEFAULT_PROXY.host,
    port: DEFAULT_PROXY.port,
    username: "",
    password: "",
  });
  editingId = config.proxies[config.proxies.length - 1].id;
  config = await saveConfig(config); // 持久化草稿，保证 id 稳定
  renderAll();
  showMessage("已新增，填写信息后点击「保存」", false);
}

/** 删除当前编辑的服务器。 */
async function onDeleteProxy() {
  const target = findProxy(editingId);
  if (!target) return;
  if (!confirm(`确定删除服务器「${target.name}」吗？`)) return;

  config.proxies = config.proxies.filter((p) => p.id !== editingId);
  // 若删的是正在使用的服务器，回退到第一个
  if (config.activeProxyId === editingId) {
    config.activeProxyId = config.proxies.length > 0 ? config.proxies[0].id : "";
  }
  editingId = config.activeProxyId;
  config = await saveConfig(config);
  renderAll();
  showMessage("已删除", false);
}

/** 将当前表单内容同步到内存中的服务器草稿。 */
function syncFormToDraft() {
  const p = findProxy(editingId);
  if (!p) return;
  p.name = els.proxyName.value;
  p.type = els.proxyType.value;
  p.host = els.proxyHost.value;
  p.port = els.proxyPort.value;
  p.username = els.proxyUser.value;
  p.password = els.proxyPass.value;
  renderList(); // 名称 / 地址变化时刷新列表显示
}

/** 从表单读取完整配置（保留 enabled 状态）。 */
function collect() {
  syncFormToDraft();
  const policyEl = document.querySelector('input[name="defaultPolicy"]:checked');
  return {
    enabled: config.enabled,
    defaultPolicy: policyEl ? policyEl.value : "direct",
    whitelist: textToList(els.whitelist.value),
    blacklist: textToList(els.blacklist.value),
    proxies: config.proxies,
    activeProxyId: config.activeProxyId,
  };
}

/** 渲染整个页面。 */
function renderAll() {
  renderList();
  renderPolicy();
  renderKeywords();
  renderForm();
}

/** 渲染服务器列表。 */
function renderList() {
  els.proxyList.innerHTML = "";
  if (config.proxies.length === 0) {
    const li = document.createElement("li");
    li.className = "proxy-empty";
    li.textContent = "暂无服务器，点击「新增」添加";
    els.proxyList.appendChild(li);
    return;
  }
  for (const p of config.proxies) {
    const li = document.createElement("li");
    li.className = "proxy-item";
    li.dataset.id = p.id;
    if (p.id === config.activeProxyId) li.classList.add("active");
    if (p.id === editingId) li.classList.add("editing");
    li.title = "点击切换为当前使用的服务器";

    const type = PROXY_TYPE_LABELS[p.type] || p.type;
    const main = document.createElement("div");
    main.className = "proxy-item-main";

    const name = document.createElement("span");
    name.className = "proxy-name";
    name.textContent = p.name;

    const addr = document.createElement("span");
    addr.className = "proxy-addr";
    addr.textContent = `${type} · ${p.host}:${p.port}`;

    main.append(name, addr);
    li.append(main);

    if (p.id === config.activeProxyId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "使用中";
      li.append(badge);
    }
    els.proxyList.appendChild(li);
  }
}

/** 渲染右侧编辑表单。 */
function renderForm() {
  const p = findProxy(editingId);
  const hasProxy = Boolean(p);
  for (const input of [
    els.proxyName,
    els.proxyType,
    els.proxyHost,
    els.proxyPort,
    els.proxyUser,
    els.proxyPass,
  ]) {
    input.disabled = !hasProxy;
  }
  els.deleteProxy.disabled = !hasProxy;
  if (!p) {
    els.proxyName.value = "";
    els.proxyType.value = "http";
    els.proxyHost.value = "";
    els.proxyPort.value = "";
    els.proxyUser.value = "";
    els.proxyPass.value = "";
    return;
  }
  els.proxyName.value = p.name;
  els.proxyType.value = p.type;
  els.proxyHost.value = p.host;
  els.proxyPort.value = p.port;
  els.proxyUser.value = p.username;
  els.proxyPass.value = p.password;
}

function renderPolicy() {
  const radio = document.querySelector(
    `input[name="defaultPolicy"][value="${config.defaultPolicy}"]`
  );
  if (radio) radio.checked = true;
}

function renderKeywords() {
  els.whitelist.value = config.whitelist.join("\n");
  els.blacklist.value = config.blacklist.join("\n");
}

async function onSave() {
  const draft = collect();

  // 校验每个服务器的主机与端口
  for (const p of draft.proxies) {
    const label = p.name || "未命名服务器";
    if (!String(p.host).trim()) {
      return showMessage(`「${label}」未填写主机`, true);
    }
    const port = parseInt(p.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return showMessage(`「${label}」端口需在 1-65535 之间`, true);
    }
  }

  config = await saveConfig(draft);
  renderAll(); // 回填规范化后的结果（去重、去空白）
  showMessage("已保存", false);
}

async function onReset() {
  config = await saveConfig(DEFAULT_CONFIG);
  editingId = config.activeProxyId;
  renderAll();
  showMessage("已重置为默认", false);
}

/** 按 id 查找服务器草稿。 */
function findProxy(id) {
  return config.proxies.find((p) => p.id === id) || null;
}

/** 多行文本转关键字数组。 */
function textToList(text) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
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
