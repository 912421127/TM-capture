interface TabLike {
  id?: number;
  url?: string;
  active?: boolean;
}

export function findSycmTabId(tabs: TabLike[]): number | null {
  const sycmTabs = tabs.filter((tab) => tab.id != null && tab.url?.startsWith('https://sycm.taobao.com/'));
  return sycmTabs.find((tab) => tab.active)?.id ?? sycmTabs[0]?.id ?? null;
}
