// 测试环境初始化 WXT 的浏览器模拟，并在每个用例后清理监听器和 mock。
import { afterEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

afterEach(() => {
  fakeBrowser.reset();
});
