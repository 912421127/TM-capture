export interface LoadedPage<Row> {
  rows: Row[];
  hasNext: boolean;
  totalPages?: number;
}

export interface PageProgress {
  currentPage: number;
  totalPages?: number;
  message: string;
}

interface CollectPagesOptions<Row> {
  loadPage(page: number): Promise<LoadedPage<Row>>;
  onProgress(progress: PageProgress): void;
}

export async function collectPages<Row>({ loadPage, onProgress }: CollectPagesOptions<Row>): Promise<Row[]> {
  const allRows: Row[] = [];

  // 页数上限是最后一道保护，防止接口分页标记异常后不断请求。
  for (let page = 1; page <= 100; page += 1) {
    const result = await loadPage(page);
    allRows.push(...result.rows);
    const suffix = result.totalPages ? `${page} / ${result.totalPages} 页` : `${page} 页`;
    onProgress({ currentPage: page, totalPages: result.totalPages, message: `已采集 ${suffix}` });
    if (!result.hasNext) return allRows;
  }

  throw new Error('采集页数超过 100 页，已停止以避免重复请求。');
}
