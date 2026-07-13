# 生意参谋接口分析助手

这是一个只做一件事的 Chrome 侧边栏插件：获取生意参谋“数据概览”接口
`/portal/coreIndex/new/getTableData/v3.json` 的响应，并按“指标 × 日期”展示汇总表。

打开生意参谋页面后，可以手动刷新；开启“每小时自动获取”后，插件会对当前标签页每小时请求一次同一接口。数据只保存在扩展后台内存中，关闭或刷新该页面后会重新开始记录；需要留存时可导出 JSON。

## 开发命令

- `npm run dev`：启动 Chrome 开发环境。
- `npm run compile`：生成 WXT 类型并执行 TypeScript 检查。
- `npm test`：运行接口解析和存储逻辑的单元测试。
- `npm run build`：生成 Chrome MV3 生产包。

## 目录职责

- `entrypoints/background.ts`：保存当前标签页的接口响应，并管理每小时自动获取任务。
- `entrypoints/sycm*.content.ts`：在生意参谋页面捕获目标接口，以及主动请求该接口。
- `entrypoints/sidepanel/`：侧边栏的刷新、定时开关、汇总表和 JSON 导出界面。
- `src/shared/request-capture.ts`：唯一接口的匹配、响应解析、表格转换和内存记录。

后续如需增加接口，在 `src/shared/request-capture.ts` 的 `CAPTURE_RULES` 和对应表格转换逻辑中增加即可；不要为了单个接口再新建一层抽象。
