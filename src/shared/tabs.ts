// 从浏览器标签页列表中选择可用于页面桥接的生意参谋标签。
interface TabLike {
  id?: number;
  url?: string;
  active?: boolean;
}

export function findSycmTabId(tabs: TabLike[]): number | null {
  const sycmTabs = tabs.filter((tab) => tab.id != null && tab.url?.startsWith('https://sycm.taobao.com/'));
  // 优先当前活动标签，避免用户同时打开多个生意参谋页面时请求发到旧页面。
  return sycmTabs.find((tab) => tab.active)?.id ?? sycmTabs[0]?.id ?? null;
}
