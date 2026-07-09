import { defineConfig } from 'wxt';
import VueRouter from 'vite-plugin-pages';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifestVersion: 3,
    manifest: ({ mode }) => ({
        name: 'TM Capture',
        description: '用于采集和整理电商页面数据的浏览器插件。',
        version: '0.1.0',
        host_permissions: ['<all_urls>'],
        permissions: [
            'accessibilityFeatures.modify',
            'accessibilityFeatures.read',
            'activeTab',
            'alarms',
            'audio',
            'background',
            'bookmarks',
            'browsingData',
            'certificateProvider',
            'clipboardRead',
            'clipboardWrite',
            'contentSettings',
            'contextMenus',
            'cookies',
            'debugger',
            'declarativeContent',
            'declarativeNetRequest',
            'declarativeNetRequestWithHostAccess',
            'declarativeNetRequestFeedback',
            'dns',
            'desktopCapture',
            'documentScan',
            'downloads',
            'downloads.open',
            'downloads.ui',
            'enterprise.deviceAttributes',
            'enterprise.hardwarePlatform',
            'enterprise.networkingAttributes',
            'enterprise.platformKeys',
            'favicon',
            'fileBrowserHandler',
            'fileSystemProvider',
            'fontSettings',
            'gcm',
            'geolocation',
            'history',
            'identity',
            'identity.email',
            'idle',
            'loginState',
            'management',
            'nativeMessaging',
            'notifications',
            'offscreen',
            'pageCapture',
            'platformKeys',
            'power',
            'printerProvider',
            'printing',
            'printingMetrics',
            'privacy',
            'processes',
            'proxy',
            'readingList',
            'runtime',
            'scripting',
            'search',
            'sessions',
            'sidePanel',
            'storage',
            'system.cpu',
            'system.display',
            'system.memory',
            'system.storage',
            'tabCapture',
            'tabGroups',
            'tabs',
            'topSites',
            'tts',
            'ttsEngine',
            'unlimitedStorage',
            'vpnProvider',
            'wallpaper',
            'webAuthenticationProxy',
            'webNavigation',
            'webRequest',
            'webRequestBlocking'
        ],
        content_security_policy: {
            extension_pages:
                mode === 'development'
                    ? "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000; object-src 'self';"
                    : "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
        }
    }),
    // WXT 的 Vue 模块负责处理 .vue 文件；这里保留页面路由自动生成配置。
    vite: () => ({
        plugins: [
            VueRouter({
                pagesDir: './src/views'
            })
        ]
    }),
    webExt: {
        disabled: true
    }
});
