// WXT 构建配置：声明 Vue 模块、MV3 权限以及页面主世界脚本的可访问资源。
import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifestVersion: 3,
    manifest: {
        name: '生意参谋采集助手',
        description: '采集并导出生意参谋首页的经营概览数据。',
        version: '0.2.0',
        minimum_chrome_version: '114',
        permissions: ['sidePanel', 'storage', 'tabs'],
        host_permissions: ['https://sycm.taobao.com/*'],
        action: {
            default_title: '打开生意参谋采集助手'
        },
        web_accessible_resources: [
            {
                resources: ['sycm-main-world.js'],
                matches: ['https://sycm.taobao.com/*']
            }
        ]
    },
    webExt: {
        disabled: true
    }
});
