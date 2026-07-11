import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifestVersion: 3,
  manifest: {
    name: '生意参谋采集助手',
    description: '自动获取并汇总生意参谋数据概览接口。',
    version: '0.2.0',
    minimum_chrome_version: '114',
    permissions: ['sidePanel', 'storage', 'tabs', 'alarms'],
    host_permissions: ['https://sycm.taobao.com/*'],
    action: {
      default_title: '打开生意参谋采集助手',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    // 主世界脚本需要由目标网页加载，必须显式声明为可访问资源。
    web_accessible_resources: [
      {
        resources: ['sycm-main-world.js'],
        matches: ['https://sycm.taobao.com/*'],
      },
    ],
  },
});
