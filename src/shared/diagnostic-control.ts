export interface DiagnosticToggleResult {
  ok: boolean;
  error?: string;
}

type SendMessage = (message: { type: 'DIAGNOSTIC_SET_ENABLED'; enabled: boolean }) => Promise<unknown>;

function isToggleResult(value: unknown): value is DiagnosticToggleResult {
  return value !== null && typeof value === 'object' && 'ok' in value && typeof value.ok === 'boolean';
}

export async function enableDiagnosticInTab(
  tabId: number,
  enabled: boolean,
  sendMessage: (tabId: number, message: { type: 'DIAGNOSTIC_SET_ENABLED'; enabled: boolean }) => Promise<unknown>,
): Promise<DiagnosticToggleResult> {
  try {
    await sendMessage(tabId, { type: 'DIAGNOSTIC_SET_ENABLED', enabled });
    return { ok: true };
  } catch {
    // 内容脚本只会在扩展安装后新加载的生意参谋页面中出现。
    return { ok: false, error: '请刷新生意参谋页面后，再开启接口诊断。' };
  }
}

export async function requestDiagnosticToggle(enabled: boolean, sendMessage: SendMessage): Promise<DiagnosticToggleResult> {
  try {
    const response = await sendMessage({ type: 'DIAGNOSTIC_SET_ENABLED', enabled });
    if (isToggleResult(response)) return response;
    return { ok: false, error: '无法启动接口诊断，请重新加载插件后重试。' };
  } catch {
    return { ok: false, error: '无法启动接口诊断，请重新加载插件后重试。' };
  }
}
