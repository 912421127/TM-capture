export type CaptureSource = 'page-json' | 'export-excel';

export interface CaptureSuccess {
    status: 'success';
    source: CaptureSource;
    url: string;
    httpStatus: number;
    data: unknown;
}

export interface CaptureFailure {
    status: 'error';
    source: CaptureSource;
    url: string;
    httpStatus: number;
    error: string;
}

export type CaptureResult = CaptureSuccess | CaptureFailure;

const SYCM_ORIGIN = 'https://sycm.taobao.com';
const PAGE_JSON_PATH = '/cc/item/view/top.json';
const EXCEL_PATH = '/cc/item/view/excel/top.json';

export function normalizeSycmUrl(input: string | { url: string }): string | null {
    const rawUrl = typeof input === 'string' ? input : input.url;

    try {
        const url = new URL(rawUrl, SYCM_ORIGIN);
        if (url.origin !== SYCM_ORIGIN || (url.pathname !== PAGE_JSON_PATH && url.pathname !== EXCEL_PATH)) return null;
        return url.href;
    } catch {
        return null;
    }
}

export function getCaptureSource(url: string): CaptureSource | null {
    const pathname = new URL(url).pathname;
    if (pathname === PAGE_JSON_PATH) return 'page-json';
    if (pathname === EXCEL_PATH) return 'export-excel';
    return null;
}

export function createCaptureSuccess(source: CaptureSource, url: string, httpStatus: number, data: unknown): CaptureSuccess {
    return { status: 'success', source, url, httpStatus, data };
}

export function createCaptureFailure(source: CaptureSource, url: string, httpStatus: number, error: string): CaptureFailure {
    return { status: 'error', source, url, httpStatus, error };
}

export function parseExcelRows(data: ArrayBuffer): Record<string, unknown>[] {
    const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error('导出文件中没有可读取的数据表。');

    // 生意参谋导出的前四行是说明信息，第五行才是字段名。
    const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: null });
    const headers = rows[4];
    if (!Array.isArray(headers)) throw new Error('导出文件缺少字段标题。');

    return rows.slice(5).map((row) => {
        const values = Array.isArray(row) ? row : [];
        return headers.reduce<Record<string, unknown>>((result, header, index) => {
            if (typeof header === 'string' && header) result[header] = values[index] ?? null;
            return result;
        }, {});
    });
}
import * as XLSX from 'xlsx';
