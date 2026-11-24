# KeyProxy（Firefox 插件）

基于域名关键字自动切换「代理 / 直连」的 Firefox 扩展。

## 功能

- **开启 / 关闭代理**：工具栏弹窗一键切换，图标显示 `ON` 状态。
- **多代理服务器**：设置页可添加任意多个代理服务器（HTTP / HTTPS / SOCKS5 / SOCKS4，可选用户名密码认证），支持名称备注。
- **一键切换**：设置页或弹窗中点击服务器列表项，立即切换当前使用的代理（后台热更新，无需重启）。
- **白名单关键字**：域名包含任一关键字 → 直连（优先级最高）。
- **黑名单关键字**：域名包含任一关键字 → 走代理。
- **默认策略**：白/黑名单都不命中时，按配置走「直连」或「代理」。

## 规则优先级

```
1. 命中白名单关键字  -> 直连
2. 命中黑名单关键字  -> 代理
3. 都不命中          -> 默认策略（direct / proxy）
```

关键字为**子串匹配**、忽略大小写。例如黑名单关键字 `google` 会命中 `www.google.com`、`google.com.hk` 等。

## 配置结构

```jsonc
{
  "enabled": false,          // 代理总开关
  "defaultPolicy": "direct", // 默认策略
  "whitelist": [],           // 白名单关键字
  "blacklist": [],           // 黑名单关键字
  "proxies": [               // 多个代理服务器
    {
      "id": "default",
      "name": "默认服务器",
      "type": "http",       // http | https | socks | socks4
      "host": "127.0.0.1",
      "port": 7890,
      "username": "",
      "password": ""
    }
  ],
  "activeProxyId": "default" // 当前生效的服务器 id，点击列表项一键切换
}
```

旧版本的单代理配置（`proxy` 对象）会在读取时自动迁移为 `proxies` 列表。

## 目录结构

```
manifest.json              插件清单（MV2）
background/
  proxy-handler.js         注册 proxy.onRequest，按规则决策（使用当前激活的服务器）
lib/
  matcher.js               关键字匹配核心逻辑（无浏览器依赖）
  storage.js               配置默认值、读写、规范化、多代理管理与旧配置迁移
popup/                     工具栏弹窗：开关 + 默认策略 + 服务器一键切换
options/                   设置页：多服务器管理、默认策略、黑白名单
icons/icon.svg             图标
_locales/zh_CN/            中文文案
test/                      Node 单元测试（node test/storage.test.js）
```

## 本地加载

1. 打开 `about:debugging` → 「此 Firefox」。
2. 点击「临时载入附加组件」，选择本目录下的 `manifest.json`。

## 配置说明

点击工具栏图标可快速开关代理、切换默认策略，并从服务器列表一键切换当前代理；点击「管理规则与服务器」进入设置页，管理多个代理服务器（新增 / 删除 / 编辑 / 点击切换）及黑白名单关键字（每行一个）。切换服务器的操作立即生效（后台通过 `storage.onChanged` 热更新）；服务器详细信息的编辑需点击「保存」。
