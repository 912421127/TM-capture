export default defineContentScript({
    matches: ['https://sycm.taobao.com/*'],
    main() {
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                var TARGET = 'https://sycm.taobao.com/cc/item/view/top.json';
                var dispatch = function(url, data) {
                    window.dispatchEvent(new CustomEvent('__api_response', { detail: { url: url, data: data, time: new Date().toISOString() } }));
                };
                var tryParse = function(text) {
                    try { return JSON.parse(text); } catch(e) { return null; }
                };
                var checkUrl = function(url) {
                    return typeof url === 'string' && url.indexOf(TARGET) === 0;
                };
                // 拦截 fetch
                if (window.fetch) {
                    var originalFetch = window.fetch.bind(window);
                    window.fetch = async function(input, init) {
                        var response = await originalFetch(input, init);
                        var url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
                        if (checkUrl(url)) {
                            response.clone().json().then(function(data) { dispatch(url, data); }).catch(function(){});
                        }
                        return response;
                    };
                }
                // 拦截 XMLHttpRequest
                var originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url) {
                    this.__apiUrl = typeof url === 'string' ? url : url instanceof URL ? url.href : '';
                    return originalOpen.apply(this, arguments);
                };
                var originalSend = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.send = function() {
                    var xhr = this;
                    var url = this.__apiUrl || '';
                    if (checkUrl(url)) {
                        xhr.addEventListener('load', function() {
                            var data = tryParse(xhr.responseText);
                            if (data) dispatch(url, data);
                        });
                    }
                    return originalSend.apply(this, arguments);
                };
            })();
        `;
        document.documentElement.appendChild(script);
        console.log(111)
        script.remove();

        window.addEventListener('__api_response', (event: Event) => {
            const detail = (event as CustomEvent).detail;
            browser.runtime.sendMessage({ type: 'API_RESPONSE', payload: detail });
        });
    }
});
