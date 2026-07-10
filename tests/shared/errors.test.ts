import { describe, expect, it } from 'vitest';
import { toUserErrorMessage } from '../../src/shared/errors';

describe('toUserErrorMessage', () => {
  it('保留已经明确的业务错误', () => {
    expect(toUserErrorMessage(new Error('登录状态已失效，请重新登录生意参谋。'))).toBe(
      '登录状态已失效，请重新登录生意参谋。',
    );
  });

  it('把未知错误转换为用户可理解的提示', () => {
    expect(toUserErrorMessage({ reason: 'unknown' })).toBe('采集失败，请刷新生意参谋页面后重试。');
  });
});
