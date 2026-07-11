export interface PageRequestContext {
  token: string;
  keyword?: string;
  follow?: string;
  cateId?: string;
  cateLevel?: string;
}

// 页面地址通常不包含接口参数，所以还要从资源时序中查找最近一次请求。
export function findPageQueryValue(key: string): string | null {
  const currentValue = new URL(location.href).searchParams.get(key);
  if (currentValue) return currentValue;

  const entries = performance.getEntriesByType('resource').reverse();
  for (const entry of entries) {
    try {
      const value = new URL((entry as PerformanceResourceTiming).name, location.href).searchParams.get(key);
      if (value) return value;
    } catch {
      // 某些资源名不是标准 URL，继续查找其他请求。
    }
  }
  return null;
}
