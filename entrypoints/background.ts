import { parseExcelRows, type CaptureResult } from '../src/features/sycmCapture';

type StoredCaptureResult = CaptureResult & { capturedAt: string };

function parseExcelData(data: unknown) {
    if (!data || typeof data !== 'object' || !('encoding' in data) || !('value' in data)) {
        throw new Error('导出文件内容为空。');
    }

    const encodedData = data as { encoding: string; value: string };
    if (encodedData.encoding !== 'base64') throw new Error('导出文件编码不受支持。');

    const binary = atob(encodedData.value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return parseExcelRows(bytes.buffer);
}

async function saveCaptureResult(result: CaptureResult) {
    const storedResult: StoredCaptureResult = {
        ...result,
        capturedAt: new Date().toISOString(),
    };

    if (storedResult.status === 'success' && storedResult.source === 'export-excel') {
        try {
            storedResult.data = parseExcelData(storedResult.data);
        } catch (error) {
            const message = error instanceof Error ? error.message : '导出文件解析失败。';
            await saveCaptureResult({
                status: 'error',
                source: storedResult.source,
                url: storedResult.url,
                httpStatus: storedResult.httpStatus,
                error: message,
            });
            return;
        }
    }

    try {
        await browser.storage.local.set({ last_response: storedResult });
    } catch (error) {
        const message = error instanceof Error ? error.message : '采集结果保存失败。';
        browser.runtime.sendMessage({ type: 'SYCM_CAPTURE_STORAGE_ERROR', error: message }).catch(() => undefined);
    }
}

export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message: { type?: string; payload?: CaptureResult }) => {
        if (message.type === 'SYCM_CAPTURED' && message.payload) {
            void saveCaptureResult(message.payload);
        }
    });
});
