# KeyProxy Privacy Policy / 隐私政策

_Last updated: 2026-07-01_

## English

KeyProxy is a browser extension that automatically switches between a proxy
server and a direct connection based on domain keyword rules configured by the
user.

**Data collection:** KeyProxy does **not** collect, transmit, sell, or share any
personal or usage data. The extension has no analytics, no tracking, and no
remote servers of its own.

**Data storage:** All configuration (proxy server address, port, optional
credentials, and whitelist/blacklist keywords) is stored **locally** in the
browser via the `chrome.storage.local` API. This data never leaves your device
except as network traffic sent directly to the proxy server **you** configured.

**Permissions usage:**
- `proxy` – to apply your proxy/direct routing rules.
- `webRequest`, `webRequestAuthProvider` – to supply the username/password you
  entered when your proxy server requests authentication.
- `host_permissions (<all_urls>)` – the PAC script must evaluate every request's
  host to decide proxy vs. direct.
- `storage` – to save your settings locally.

**Contact:** For any questions about this policy, please open an issue on the
project's repository.

---

## 简体中文

KeyProxy 是一款浏览器扩展，根据用户配置的域名关键字规则，在「走代理」与
「直连」之间自动切换。

**数据收集：** KeyProxy **不**收集、不上传、不出售、不共享任何个人或使用数据。
本扩展没有任何统计分析、没有追踪，也没有自建的远程服务器。

**数据存储：** 所有配置（代理服务器地址、端口、可选的账号密码、以及白/黑名单
关键字）均通过 `chrome.storage.local` **仅存储在本地浏览器**。除了作为网络流量
发送到**您自己配置**的代理服务器之外，这些数据不会离开您的设备。

**权限用途：**
- `proxy` —— 应用您的代理 / 直连路由规则。
- `webRequest`、`webRequestAuthProvider` —— 当代理服务器要求认证时，提供您填写
  的用户名 / 密码。
- `host_permissions (<all_urls>)` —— PAC 脚本需对每个请求的域名做代理 / 直连
  决策。
- `storage` —— 在本地保存您的设置。

**联系方式：** 如对本政策有任何疑问，请在项目仓库提交 issue。
