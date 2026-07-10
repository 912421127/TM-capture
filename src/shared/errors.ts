export function toUserErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return '采集失败，请刷新生意参谋页面后重试。';
}
