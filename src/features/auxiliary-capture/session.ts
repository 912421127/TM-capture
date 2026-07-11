export interface AuxiliaryCaptureSessionDependencies {
  readSessions: () => Promise<number[]>;
  saveSessions: (tabIds: number[]) => Promise<void>;
  sendSession: (tabId: number, enabled: boolean) => Promise<void>;
  clearRecords: (tabId: number) => void;
}

export interface AuxiliaryCaptureSessionResult {
  ok: boolean;
  enabled: boolean;
  error?: string;
}

export function createAuxiliaryCaptureSessionManager(dependencies: AuxiliaryCaptureSessionDependencies) {
  const enabledTabs = new Set<number>();
  let loadPromise: Promise<void> | undefined;

  async function ensureLoaded(): Promise<void> {
    if (!loadPromise) {
      loadPromise = dependencies.readSessions().then((tabIds) => {
        tabIds.forEach((tabId) => enabledTabs.add(tabId));
      }).catch((error) => {
        loadPromise = undefined;
        throw error;
      });
    }
    await loadPromise;
  }

  async function save(): Promise<void> {
    await dependencies.saveSessions([...enabledTabs]);
  }

  return {
    async getStatus(tabId: number): Promise<boolean> {
      await ensureLoaded();
      return enabledTabs.has(tabId);
    },

    async setEnabled(tabId: number, enabled: boolean): Promise<AuxiliaryCaptureSessionResult> {
      await ensureLoaded();
      if (enabled) {
        try {
          // 先确认内容脚本可用，避免写入刷新后会自动恢复的幽灵会话。
          await dependencies.sendSession(tabId, true);
        } catch {
          return { ok: false, enabled: false, error: '无法连接当前生意参谋页面，请重新打开页面' };
        }
        enabledTabs.add(tabId);
        try {
          await save();
        } catch {
          enabledTabs.delete(tabId);
          // 持久化没完成就撤回页面监听，避免当前页与后台状态不一致。
          await dependencies.sendSession(tabId, false).catch(() => undefined);
          return { ok: false, enabled: false, error: '无法保存辅助抓包状态，请重试' };
        }
        dependencies.clearRecords(tabId);
        return { ok: true, enabled: true };
      }

      let sendFailed = false;
      try {
        await dependencies.sendSession(tabId, false);
      } catch {
        sendFailed = true;
      }
      // 停止时即使页面已关闭，也必须先关闭后台状态，防止下次刷新又恢复抓包。
      enabledTabs.delete(tabId);
      await save();
      return sendFailed
        ? { ok: false, enabled: false, error: '页面连接已断开，后台已停止抓包' }
        : { ok: true, enabled: false };
    },

    async restoreForPage(tabId: number): Promise<void> {
      await ensureLoaded();
      if (enabledTabs.has(tabId)) await dependencies.sendSession(tabId, true);
    },

    async removeTab(tabId: number): Promise<void> {
      await ensureLoaded();
      if (!enabledTabs.delete(tabId)) return;
      await save();
    },
  };
}
