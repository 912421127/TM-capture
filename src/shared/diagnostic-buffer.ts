import type { DiagnosticRecord } from './diagnostic';

export function createDiagnosticBuffer(limit = 100) {
  let records: DiagnosticRecord[] = [];

  return {
    add(record: DiagnosticRecord): void {
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
