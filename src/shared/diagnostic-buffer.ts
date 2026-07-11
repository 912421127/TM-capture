// 诊断构建专用的内存环形缓冲区，限制记录数量避免后台长期运行时无限增长。
import type { DiagnosticRecord } from './diagnostic';

export function createDiagnosticBuffer(limit = 100) {
  let records: DiagnosticRecord[] = [];

  return {
    add(record: DiagnosticRecord): void {
      // 只保留最新记录，导出样本时不会携带过大的历史数据。
      records = [...records, record].slice(-limit);
    },
    list(): DiagnosticRecord[] {
      return [...records];
    },
    clear(): void {
      records = [];
    },
  };
}
