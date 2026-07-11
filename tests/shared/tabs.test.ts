// 验证标签页选择优先活动生意参谋页，并正确处理无匹配情况。
import { describe, expect, it } from 'vitest';
import { findSycmTabId } from '../../src/shared/tabs';

describe('findSycmTabId', () => {
  it('优先使用当前活动的生意参谋标签页', () => {
    expect(
      findSycmTabId([
        { id: 1, url: 'https://sycm.taobao.com/home', active: false },
        { id: 2, url: 'https://sycm.taobao.com/mc/index', active: true },
      ]),
    ).toBe(2);
  });

  it('找不到生意参谋页面时返回空', () => {
    expect(findSycmTabId([{ id: 1, url: 'https://example.com', active: true }])).toBeNull();
  });
});
