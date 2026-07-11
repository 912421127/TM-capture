// 验证诊断开关消息在成功、返回格式错误和页面未注入时的提示。
import { describe, expect, it } from 'vitest';
import { enableDiagnosticInTab, requestDiagnosticToggle } from '../../src/shared/diagnostic-control';

describe('diagnostic control', () => {
  it('内容脚本不存在时提示刷新生意参谋页面', async () => {
    const result = await enableDiagnosticInTab(12, true, async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    });

    expect(result).toEqual({ ok: false, error: '请刷新生意参谋页面后，再开启接口诊断。' });
  });

  it('后台消息异常时不让侧边栏抛出未处理 Promise', async () => {
    const result = await requestDiagnosticToggle(true, async () => {
      throw new Error('background unavailable');
    });

    expect(result).toEqual({ ok: false, error: '无法启动接口诊断，请重新加载插件后重试。' });
  });
});
