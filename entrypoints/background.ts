export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message: any) => {
        if (message.type === 'API_RESPONSE') {
            browser.storage.local.set({ last_response: message.payload }).catch(console.error);
        }
    });
});
