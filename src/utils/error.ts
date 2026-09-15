export const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn hoặc thông tin không chính xác.',
  FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  TIMEOUT: 'Yêu cầu quá thời gian phản hồi. Vui lòng thử lại.',
  NETWORK_ERROR: 'Không thể kết nối máy chủ. Vui lòng kiểm tra đường truyền mạng.',
};

export function messageOf(error: unknown): string {
  if (!error) return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  const err = error as Record<string, unknown>;
  if (typeof err.code === 'string' && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }
  if (typeof err.message === 'string') {
    if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (err.message.includes('timeout') || err.message.includes('Aborted')) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    return err.message;
  }
  return 'Thao tác không thành công. Vui lòng thử lại sau.';
}
