export type CsvRow = Record<string, unknown>;

const UTF8_BOM = '\ufeff';

declare const chrome: {
    downloads: {
        download(options: { url: string; filename: string; saveAs: boolean }, callback: (downloadId?: number) => void): void;
    };
    runtime: {
        lastError?: {
            message?: string;
        };
    };
};

function formatCsvValue(value: unknown) {
    if (value === null || value === undefined) {
        return '';
    }

    const text = String(value);
    const needsQuotes = text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r');
    const escapedText = text.replace(/"/g, '""');

    return needsQuotes ? `"${escapedText}"` : escapedText;
}

export function rowsToCsv(rows: CsvRow[]) {
    if (rows.length === 0) {
        return UTF8_BOM;
    }

    // 使用第一行的字段顺序作为 CSV 表头，保证导出的列顺序和整理后的数据一致。
    const headers = Object.keys(rows[0]);
    const lines = rows.map(row => headers.map(header => formatCsvValue(row[header])).join(','));

    return `${UTF8_BOM}${headers.join(',')}\r\n${lines.join('\r\n')}`;
}

export async function downloadRowsAsCsv(rows: CsvRow[], filename: string) {
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
        await new Promise<number | undefined>((resolve, reject) => {
            // 通过 downloads API 直接保存文件，避免用户还要再点一次导出按钮。
            chrome.downloads.download({ url, filename, saveAs: false }, (downloadId?: number) => {
                const errorMessage = chrome.runtime.lastError?.message;
                if (errorMessage) {
                    reject(new Error(errorMessage));
                    return;
                }

                resolve(downloadId);
            });
        });
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
}
