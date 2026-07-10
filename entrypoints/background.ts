import { createDiagnosticBuffer } from '../src/shared/diagnostic-buffer';
import type { DiagnosticRecord } from '../src/shared/diagnostic';
import { initializeStorage } from '../src/shared/storage';
import { findSycmTabId } from '../src/shared/tabs';

interface ExtensionMessage {
  type?: string;
  enabled?: boolean;
  record?: DiagnosticRecord;
}

export default defineBackground(() => {
  const diagnosticBuffer = createDiagnosticBuffer();

  void initializeStorage();
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  async function getSycmTabId(): Promise<number | null> {
    const tabs = await browser.tabs.query({ url: 'https://sycm.taobao.com/*' });
    return findSycmTabId(tabs);
  }

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
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
        await browser.tabs.sendMessage(tabId, { type: 'DIAGNOSTIC_SET_ENABLED', enabled: Boolean(message.enabled) });
        return { ok: true };
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
