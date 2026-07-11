# 生意参谋接口分析助手

这是一个可扩展的 Chrome 侧边栏插件。当前已支持获取生意参谋“数据概览”接口
`/portal/coreIndex/new/getTableData/v3.json` 的响应，并按“指标 × 日期”展示汇总表。

打开生意参谋页面后，可以手动刷新；每个接口都可独立开启定时获取，并选择 15、30 或 60 分钟。数据只保存在扩展后台内存中，关闭或刷新页面后会重新开始记录；定时配置会保存在本地。需要留存时可按接口导出 JSON。

## 开发命令

- `npm run dev`：启动 Chrome 开发环境。
- `npm run compile`：生成 WXT 类型并执行 TypeScript 检查。
- `npm test`：运行接口解析和存储逻辑的单元测试。
- `npm run build`：生成 Chrome MV3 生产包。

## 目录职责

- `entrypoints/background.ts`：保存各接口响应，并管理每个接口独立的定时任务。
- `entrypoints/sycm*.content.ts`：在生意参谋页面拦截请求，并将指定接口的主动请求转交给接口模块。
- `entrypoints/sidepanel/`：侧边栏基础页面。
- `src/features/`：每个接口一个文件夹，包含接口规则、主动请求、数据整理和专属展示。
- `src/shared/`：请求记录、浏览器通信和定时配置等公共能力。

## 新增接口

1. 在 `src/features/` 新建接口文件夹，定义接口 ID、中文名称、URL 规则和主动请求函数。
2. 在 `src/features/index.ts` 登记该接口；公共采集层会自动按 URL 标记它的记录。
3. 需要表格或图表时，将转换逻辑和 Vue 组件放在该接口文件夹中；不要把接口专属逻辑放进 `src/shared/`，也不要引用其他接口文件夹。
4. 在侧边栏接入该接口的独立操作区，并为响应转换和调度行为补充测试。
