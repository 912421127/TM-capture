export default defineContentScript({
    matches: ['https://sycm.taobao.com/*'],
    runAt: 'document_start',
    main() {
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                if (window.__tmCaptureInstalled) return;
                window.__tmCaptureInstalled = true;
                var ORIGIN = 'https://sycm.taobao.com';
                var JSON_PATH = '/cc/item/view/top.json';
                var EXCEL_PATH = '/cc/item/view/excel/top.json';
                var dispatch = function(detail) {
                    window.dispatchEvent(new CustomEvent('__sycm_capture', { detail: detail }));
                };
                var normalizeUrl = function(input) {
                    var rawUrl = typeof input === 'string' ? input : input && input.url;
                    try {
                        var url = new URL(rawUrl, location.href);
                        if (url.origin !== ORIGIN || (url.pathname !== JSON_PATH && url.pathname !== EXCEL_PATH)) return null;
                        return url.href;
                    } catch (error) {
                        return null;
                    }
                };
                var getSource = function(url) {
                    return new URL(url).pathname === EXCEL_PATH ? 'export-excel' : 'page-json';
                };
                var toBase64 = function(buffer) {
                    var bytes = new Uint8Array(buffer);
                    var result = '';
                    for (var index = 0; index < bytes.length; index += 8192) {
                        result += String.fromCharCode.apply(null, bytes.subarray(index, index + 8192));
                    }
                    return btoa(result);
                };
                var captureResponse = function(url, response) {
                    var source = getSource(url);
                    if (!response.ok) {
                        dispatch({ status: 'error', source: source, url: url, httpStatus: response.status, error: '接口请求失败，请确认已登录生意参谋后刷新页面。' });
                        return;
                    }
                    if (source === 'page-json') {
                        response.clone().json().then(function(data) {
                            dispatch({ status: 'success', source: source, url: url, httpStatus: response.status, data: data });
                        }).catch(function() {
                            dispatch({ status: 'error', source: source, url: url, httpStatus: response.status, error: '页面接口返回的数据无法解析。' });
                        });
                        return;
                    }
                    response.clone().arrayBuffer().then(function(buffer) {
                        dispatch({ status: 'success', source: source, url: url, httpStatus: response.status, data: { encoding: 'base64', value: toBase64(buffer) } });
                    }).catch(function() {
                        dispatch({ status: 'error', source: source, url: url, httpStatus: response.status, error: '导出文件读取失败。' });
                    });
                };
                if (window.fetch) {
                    var originalFetch = window.fetch.bind(window);
                    window.fetch = async function(input, init) {
                        var url = normalizeUrl(input);
                        try {
                            var response = await originalFetch(input, init);
                            if (url) captureResponse(url, response);
                            return response;
                        } catch (error) {
                            if (url) {
                                dispatch({ status: 'error', source: getSource(url), url: url, httpStatus: 0, error: '接口网络请求失败，请检查网络后刷新页面。' });
                            }
                            throw error;
                        }
                    };
                }
                var originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url) {
                    this.__sycmUrl = normalizeUrl(url);
                    return originalOpen.apply(this, arguments);
                };
                var originalSend = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.send = function() {
                    var xhr = this;
                    var url = this.__sycmUrl;
                    if (url) {
                        xhr.addEventListener('load', function() {
                            var source = getSource(url);
                            if (xhr.status < 200 || xhr.status >= 300) {
                                dispatch({ status: 'error', source: source, url: url, httpStatus: xhr.status, error: '接口请求失败，请确认已登录生意参谋后刷新页面。' });
                                return;
                            }
                            if (source === 'page-json') {
                                try {
                                    dispatch({ status: 'success', source: source, url: url, httpStatus: xhr.status, data: JSON.parse(xhr.responseText) });
                                } catch (error) {
                                    dispatch({ status: 'error', source: source, url: url, httpStatus: xhr.status, error: '页面接口返回的数据无法解析。' });
                                }
                            } else if (xhr.response instanceof ArrayBuffer) {
                                dispatch({ status: 'success', source: source, url: url, httpStatus: xhr.status, data: { encoding: 'base64', value: toBase64(xhr.response) } });
                            } else {
                                dispatch({ status: 'error', source: source, url: url, httpStatus: xhr.status, error: '导出文件不是二进制响应，暂时无法解析。' });
                            }
                        });
                        xhr.addEventListener('error', function() {
                            dispatch({ status: 'error', source: getSource(url), url: url, httpStatus: xhr.status || 0, error: '接口网络请求失败，请检查网络后刷新页面。' });
                        });
                    }
                    return originalSend.apply(this, arguments);
                };
            })();
        `;
        document.documentElement.appendChild(script);
        script.remove();

        window.addEventListener('__sycm_capture', (event: Event) => {
            const detail = (event as CustomEvent).detail;
            browser.runtime.sendMessage({ type: 'SYCM_CAPTURED', payload: detail });
        });
    },
});
