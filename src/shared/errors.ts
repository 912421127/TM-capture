// 将未知异常统一转换为可以直接展示给普通用户的中文提示。
export function toUserErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return '采集失败，请刷新生意参谋页面后重试。';
}
