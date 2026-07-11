// 后台入口负责浏览器生命周期、采集任务调度、标签页桥接和诊断记录转发。
import { createDiagnosticBuffer } from '../src/shared/diagnostic-buffer';
import { enableDiagnosticInTab } from '../src/shared/diagnostic-control';
import type { DiagnosticRecord } from '../src/shared/diagnostic';
import { featureRegistry } from '../src/features';
import type { CaptureRequest } from '../src/shared/capture';
import { createCaptureHandler } from '../src/shared/capture-handler';
import { initializeStorage, saveLatestCapture } from '../src/shared/storage';
import { findSycmTabId } from '../src/shared/tabs';
import { createTabTransport, type PageRequestResponse } from '../src/shared/transport';

interface ExtensionMessage {
  type?: string;
  enabled?: boolean;
  record?: DiagnosticRecord;
}

export default defineBackground(() => {
  // 诊断记录只保存在后台内存，关闭后台后自动清空，避免敏感样本长期落盘。
  const diagnosticBuffer = createDiagnosticBuffer();

  void initializeStorage();
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  async function getSycmTabId(): Promise<number | null> {
    const tabs = await browser.tabs.query({ url: 'https://sycm.taobao.com/*' });
    return findSycmTabId(tabs);
  }

  const handleCapture = createCaptureHandler({
    registry: featureRegistry,
    getTabId: getSycmTabId,
    createTransport: (tabId) =>
      // 所有采集请求都通过当前生意参谋标签页的内容脚本进入页面环境。
      createTabTransport(tabId, async (targetTabId, requestMessage) => {
        return (await browser.tabs.sendMessage(targetTabId, requestMessage)) as PageRequestResponse;
      }),
    save: saveLatestCapture,
    broadcast: async (progressMessage) => {
      await browser.runtime.sendMessage(progressMessage).catch(() => undefined);
    },
  });

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    // 消息分支保持扁平，便于区分生产采集流程和仅诊断构建才存在的功能。
    if (message.type === 'CAPTURE_START') {
      return handleCapture(message as CaptureRequest);
    }
    if (message.type === 'CONNECTION_CHECK') {
      return getSycmTabId().then((tabId) => ({ connected: tabId != null }));
    }

    if (message.type === 'OPEN_SYCM') {
      return browser.tabs.create({ url: 'https://sycm.taobao.com/' }).then(() => ({ ok: true }));
    }

    if (message.type === 'DIAGNOSTIC_LIST' && import.meta.env.MODE === 'diagnostic') {
      return Promise.resolve({ records: diagnosticBuffer.list() });
    }

    if (message.type === 'DIAGNOSTIC_SET_ENABLED' && import.meta.env.MODE === 'diagnostic') {
      if (message.enabled) diagnosticBuffer.clear();
      return getSycmTabId().then(async (tabId) => {
        if (tabId == null) return { ok: false, error: '请先打开并登录生意参谋。' };
        return enableDiagnosticInTab(tabId, Boolean(message.enabled), browser.tabs.sendMessage);
      });
    }

    if (message.type === 'DIAGNOSTIC_RECORD' && message.record && import.meta.env.MODE === 'diagnostic') {
      diagnosticBuffer.add(message.record);
      void browser.runtime.sendMessage({ type: 'DIAGNOSTIC_UPDATE', record: message.record }).catch(() => undefined);
      return Promise.resolve({ ok: true });
    }

    return undefined;
  });
});
