// 封装侧边栏、后台和内容脚本之间的诊断开关消息，并把通信失败转换成用户提示。
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
    // 诊断脚本可能尚未注入当前页面，所以发送失败时提示刷新页面，而不是暴露底层异常。
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
