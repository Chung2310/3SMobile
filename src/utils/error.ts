export const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn hoặc thông tin không chính xác.',
  FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  TIMEOUT: 'Có sự cố không mong muốn từ máy chủ ! Vui lòng thử lại sau.',
  NETWORK_ERROR: 'Có sự cố không mong muốn từ máy chủ ! Vui lòng thử lại sau.',
  SERVER_ERROR: 'Có sự cố không mong muốn từ máy chủ ! Vui lòng thử lại sau.',
};

const DEFAULT_FALLBACK_ERROR = 'Có sự cố không mong muốn từ máy chủ ! Vui lòng thử lại sau.';

export function messageOf(error: unknown): string {
  if (!error) return DEFAULT_FALLBACK_ERROR;
  const err = error as Record<string, unknown>;
  if (typeof err.code === 'string' && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }
  if (typeof err.message === 'string') {
    const lower = err.message.toLowerCase();
    if (
      lower.includes('network request failed') ||
      lower.includes('failed to fetch') ||
      lower.includes('timeout') ||
      lower.includes('aborted') ||
      lower.includes('internal server error') ||
      lower.includes('gateway timeout') ||
      lower.includes('bad gateway') ||
      /\b(500|502|503|504|404)\b/.test(err.message)
    ) {
      return DEFAULT_FALLBACK_ERROR;
    }
    return err.message;
  }
  return DEFAULT_FALLBACK_ERROR;
}
