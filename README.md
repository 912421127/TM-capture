# 生意参谋经营概览采集助手

Chrome 侧边栏插件，用于采集生意参谋首页的经营概览数据，并导出 Excel 或 CSV。

## 开发命令

- `npm run dev`：启动 Chrome 开发环境。
- `npm run build:diagnostic`：生成包含临时接口诊断工具的构建。
- `npm run compile`：生成 WXT 类型并执行 TypeScript 检查。
- `npm test`：运行单元测试和组件测试。
- `npm run build`：生成 Chrome MV3 生产包。

## 目录职责

- `entrypoints/`：浏览器扩展入口，只处理浏览器生命周期和页面挂载。
- `src/features/`：经营概览接口适配逻辑，后续新增接口时按同样方式增加模块。
- `src/shared/`：页面请求、鉴权、响应解析、采集协调、存储和导出等核心能力。

真实接口必须先通过开发模式诊断工具采集脱敏样本，再固化为适配器和测试夹具。

## 接口诊断

1. 运行 `npm run build:diagnostic`。
2. 在 Chrome 扩展管理页加载 `.output/chrome-mv3-diagnostic`。
3. 打开并登录生意参谋，再点击插件图标打开侧边栏。
4. 开启“接口诊断”，刷新页面，然后操作生意参谋的数据概览面板。
5. 回到侧边栏导出脱敏样本。诊断记录只保存在后台内存中，关闭后台后不会保留。

普通 `npm run build` 会移除诊断监听代码，只生成生产功能。
