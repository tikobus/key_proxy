/**
 * storage.js 单元测试：多代理配置、旧版迁移、一键切换逻辑。
 * 运行：node test/storage.test.js
 */
const assert = require("assert");
const path = require("path");
const storage = require(path.join(__dirname, "..", "lib", "storage.js"));

// 模拟 browser.storage.local
function mockStorage(initial) {
  const data = { ...initial };
  return {
    get: async () => ({ ...data }),
    set: async (patch) => Object.assign(data, patch),
    _data: data,
  };
}

(async () => {
  // 1. 默认配置
  let cfg = storage.normalizeConfig({});
  assert.strictEqual(cfg.proxies.length, 1);
  assert.strictEqual(cfg.activeProxyId, cfg.proxies[0].id);
  assert.strictEqual(cfg.proxies[0].host, "127.0.0.1");
  assert.strictEqual(cfg.proxies[0].port, 7890);
  console.log("✓ 默认配置包含一个服务器且 activeProxyId 指向它");

  // 2. 旧版单代理配置迁移
  cfg = storage.normalizeConfig({
    enabled: true,
    proxy: { type: "socks", host: "10.0.0.1", port: 1080, username: "u", password: "p" },
  });
  assert.strictEqual(cfg.proxies.length, 1);
  assert.strictEqual(cfg.proxies[0].type, "socks");
  assert.strictEqual(cfg.proxies[0].host, "10.0.0.1");
  assert.strictEqual(cfg.proxies[0].port, 1080);
  assert.strictEqual(cfg.proxies[0].username, "u");
  assert.strictEqual(cfg.activeProxyId, cfg.proxies[0].id);
  console.log("✓ 旧版 proxy 对象自动迁移为 proxies[0] 并激活");

  // 3. 多代理 + activeProxyId 指向第二项
  cfg = storage.normalizeConfig({
    proxies: [
      { id: "a", name: "A", host: "1.1.1.1", port: 1 },
      { id: "b", name: "B", type: "socks", host: "2.2.2.2", port: 2 },
    ],
    activeProxyId: "b",
  });
  assert.strictEqual(storage.getActiveProxy(cfg).name, "B");
  console.log("✓ getActiveProxy 返回 activeProxyId 指向的服务器");

  // 4. activeProxyId 指向不存在的条目 -> 回退第一项
  cfg = storage.normalizeConfig({
    proxies: [
      { id: "a", name: "A", host: "1.1.1.1", port: 1 },
      { id: "b", name: "B", host: "2.2.2.2", port: 2 },
    ],
    activeProxyId: "gone",
  });
  assert.strictEqual(cfg.activeProxyId, "a");
  console.log("✓ 失效的 activeProxyId 回退到第一项");

  // 5. 空列表合法（用户可删除全部服务器）
  cfg = storage.normalizeConfig({ proxies: [] });
  assert.strictEqual(cfg.proxies.length, 0);
  assert.strictEqual(cfg.activeProxyId, "");
  assert.strictEqual(storage.getActiveProxy(cfg), null);
  console.log("✓ 允许空列表，getActiveProxy 返回 null");

  // 6. 新增条目缺 id 时自动生成且稳定（持久化后不变）
  cfg = storage.normalizeConfig({ proxies: [{ name: "x", host: "h", port: 3 }] });
  const id1 = cfg.proxies[0].id;
  cfg = storage.normalizeConfig(cfg);
  assert.strictEqual(cfg.proxies[0].id, id1);
  console.log("✓ 自动生成的 id 在再次规范化后保持稳定");

  // 7. saveActiveProxyId：只改激活项，不动其它字段
  global.browser = {
    storage: {
      local: mockStorage({
        enabled: true,
        defaultPolicy: "proxy",
        whitelist: ["a"],
        blacklist: ["b"],
        proxies: [
          { id: "p1", name: "S1", type: "http", host: "1.1.1.1", port: 80 },
          { id: "p2", name: "S2", type: "socks", host: "2.2.2.2", port: 1080 },
        ],
        activeProxyId: "p1",
      }),
      onChanged: { addListener() {} },
    },
  };
  cfg = await storage.saveActiveProxyId("p2");
  assert.strictEqual(cfg.activeProxyId, "p2");
  assert.strictEqual(global.browser.storage.local._data.activeProxyId, "p2");
  assert.strictEqual(global.browser.storage.local._data.proxies.length, 2);
  // 幂等 + 无效 id 不生效
  cfg = await storage.saveActiveProxyId("nope");
  assert.strictEqual(global.browser.storage.local._data.activeProxyId, "p2");
  console.log("✓ saveActiveProxyId 仅写入 activeProxyId，无效 id 被忽略");

  // 8. persistActiveProxyId：只写 key、不重载（草稿保留由调用方内存负责）
  await storage.persistActiveProxyId("p1");
  assert.strictEqual(global.browser.storage.local._data.activeProxyId, "p1");
  console.log("✓ persistActiveProxyId 仅写入 activeProxyId 字段");

  // 9. saveConfig 全量保存
  cfg = await storage.saveConfig({
    enabled: true,
    defaultPolicy: "proxy",
    whitelist: [" x ", "x", ""],
    blacklist: [],
    proxies: [{ id: "k", name: " K ", host: " h ", port: "8080" }],
    activeProxyId: "k",
  });
  assert.deepStrictEqual(cfg.whitelist, ["x"]);
  assert.strictEqual(cfg.proxies[0].name, "K");
  assert.strictEqual(cfg.proxies[0].host, "h");
  assert.strictEqual(cfg.proxies[0].port, 8080);
  assert.strictEqual(global.browser.storage.local._data.proxies[0].port, 8080);
  console.log("✓ saveConfig 规范化并持久化");

  console.log("\n全部测试通过 ✓");
})().catch((e) => {
  console.error("测试失败:", e);
  process.exit(1);
});
