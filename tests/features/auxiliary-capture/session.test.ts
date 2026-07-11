import { describe, expect, it, vi } from 'vitest';
import { createAuxiliaryCaptureSessionManager } from '../../../src/features/auxiliary-capture/session';

describe('辅助抓包会话', () => {
  it('先通知内容脚本成功，才持久化并开启会话', async () => {
    const sendSession = vi.fn().mockResolvedValue(undefined);
    const saveSessions = vi.fn().mockResolvedValue(undefined);
    const clearRecords = vi.fn();
    const manager = createAuxiliaryCaptureSessionManager({
      readSessions: vi.fn().mockResolvedValue([]),
      saveSessions,
      sendSession,
      clearRecords,
    });

    await expect(manager.setEnabled(12, true)).resolves.toEqual({ ok: true, enabled: true });
    expect(sendSession).toHaveBeenCalledBefore(saveSessions);
    expect(saveSessions).toHaveBeenCalledWith([12]);
    expect(clearRecords).toHaveBeenCalledWith(12);
  });

  it('启动通知失败时不会留下可恢复的幽灵会话', async () => {
    const saveSessions = vi.fn().mockResolvedValue(undefined);
    const manager = createAuxiliaryCaptureSessionManager({
      readSessions: vi.fn().mockResolvedValue([]),
      saveSessions,
      sendSession: vi.fn().mockRejectedValue(new Error('no receiver')),
      clearRecords: vi.fn(),
    });

    await expect(manager.setEnabled(12, true)).resolves.toMatchObject({ ok: false, enabled: false });
    await expect(manager.getStatus(12)).resolves.toBe(false);
    expect(saveSessions).not.toHaveBeenCalled();
  });

  it('会话持久化失败时不向 UI 报告开启成功，也不保留内存状态', async () => {
    const manager = createAuxiliaryCaptureSessionManager({
      readSessions: vi.fn().mockResolvedValue([]),
      saveSessions: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      sendSession: vi.fn().mockResolvedValue(undefined),
      clearRecords: vi.fn(),
    });

    await expect(manager.setEnabled(12, true)).resolves.toMatchObject({ ok: false, enabled: false });
    await expect(manager.getStatus(12)).resolves.toBe(false);
  });

  it('停止通知失败时仍删除持久会话并报告关闭状态', async () => {
    const saveSessions = vi.fn().mockResolvedValue(undefined);
    const manager = createAuxiliaryCaptureSessionManager({
      readSessions: vi.fn().mockResolvedValue([12]),
      saveSessions,
      sendSession: vi.fn().mockRejectedValue(new Error('no receiver')),
      clearRecords: vi.fn(),
    });

    await expect(manager.setEnabled(12, false)).resolves.toMatchObject({ ok: false, enabled: false });
    await expect(manager.getStatus(12)).resolves.toBe(false);
    expect(saveSessions).toHaveBeenCalledWith([]);
  });

  it('后台重启后先读取会话，再在页面就绪时恢复监听', async () => {
    const sendSession = vi.fn().mockResolvedValue(undefined);
    const manager = createAuxiliaryCaptureSessionManager({
      readSessions: vi.fn().mockResolvedValue([12]),
      saveSessions: vi.fn().mockResolvedValue(undefined),
      sendSession,
      clearRecords: vi.fn(),
    });

    await expect(manager.getStatus(12)).resolves.toBe(true);
    await manager.restoreForPage(12);
    expect(sendSession).toHaveBeenCalledWith(12, true);
  });

  it('标签页关闭后删除可恢复会话', async () => {
    const saveSessions = vi.fn().mockResolvedValue(undefined);
    const manager = createAuxiliaryCaptureSessionManager({
      readSessions: vi.fn().mockResolvedValue([12]),
      saveSessions,
      sendSession: vi.fn(),
      clearRecords: vi.fn(),
    });

    await manager.removeTab(12);
    expect(saveSessions).toHaveBeenCalledWith([]);
  });
});
