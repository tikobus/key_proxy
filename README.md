# KeyProxy（Firefox 插件）

基于域名关键字自动切换「代理 / 直连」的 Firefox 扩展。

## 功能

- **开启 / 关闭代理**：工具栏弹窗一键切换，图标显示 `ON` 状态。
- **白名单关键字**：域名包含任一关键字 → 直连（优先级最高）。
- **黑名单关键字**：域名包含任一关键字 → 走代理。
- **默认策略**：白/黑名单都不命中时，按配置走「直连」或「代理」。
- **代理服务器配置**：支持 HTTP / HTTPS / SOCKS5 / SOCKS4，及可选用户名密码认证。

## 规则优先级

```
1. 命中白名单关键字  -> 直连
2. 命中黑名单关键字  -> 代理
3. 都不命中          -> 默认策略（direct / proxy）
```

关键字为**子串匹配**、忽略大小写。例如黑名单关键字 `google` 会命中 `www.google.com`、`google.com.hk` 等。

## 目录结构

```
manifest.json              插件清单（MV2）
background/
  proxy-handler.js         注册 proxy.onRequest，按规则决策
lib/
  matcher.js               关键字匹配核心逻辑（无浏览器依赖）
  storage.js               配置默认值、读写、规范化封装
popup/                     工具栏弹窗：开关 + 默认策略
options/                   设置页：服务器、默认策略、黑白名单
icons/icon.svg             图标
_locales/zh_CN/            中文文案
```

## 本地加载

1. 打开 `about:debugging` → 「此 Firefox」。
2. 点击「临时载入附加组件」，选择本目录下的 `manifest.json`。

## 配置说明

点击工具栏图标可快速开关代理与切换默认策略；点击「管理规则与服务器」进入设置页，配置代理服务器地址、黑白名单关键字（每行一个）。配置保存后后台会通过 `storage.onChanged` 立即热更新生效。
