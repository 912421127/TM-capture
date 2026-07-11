// Vitest 配置：用 jsdom 模拟侧边栏 DOM，并接入 WXT 的浏览器测试插件。
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [vue(), WxtVitest()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    exclude: ['**/node_modules/**', '**/.git/**', '**/.worktrees/**'],
  },
});
