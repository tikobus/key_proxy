/**
 * web-ext 配置：build / sign / lint 共用。
 * ignore-files 为全局选项；打包产物只包含扩展运行所需文件，
 * 排除测试与开发工具目录。
 */
module.exports = {
  sourceDir: "./",
  artifactsDir: "./web-ext-artifacts",

  ignoreFiles: [
    "test",
    "test/**",
    "tools",
    "tools/**",
    "docs",
    "docs/**",
    ".claude",
    ".claude/**",
    "README.md",
    ".gitignore",
    "web-ext-config.cjs",
  ],
};
