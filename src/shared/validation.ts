// 在请求发出前校验日期和市场类目，避免无效参数触发不必要的页面请求。
import type { FeatureId, FiltersFor, MarketProductRankFilters } from './capture';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateFilters<F extends FeatureId>(featureId: F, filters: FiltersFor<F>): string[] {
  const errors: string[] = [];

  if (!DATE_PATTERN.test(filters.startDate) || !DATE_PATTERN.test(filters.endDate)) {
    errors.push('请选择完整的开始日期和结束日期。');
  } else if (filters.endDate < filters.startDate) {
    errors.push('结束日期不能早于开始日期。');
  }

  if (featureId === 'market-product-rank') {
    const marketFilters = filters as MarketProductRankFilters;
    if (!marketFilters.categoryId || !marketFilters.categoryName) {
      errors.push('请选择市场类目。');
    }
  }

  return errors;
}
