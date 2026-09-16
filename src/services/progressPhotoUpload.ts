export const MAX_PROGRESS_PHOTO_BYTES = 5 * 1024 * 1024;

export function progressPhotoFormData(blob: Blob, mimeType: string): FormData {
  const type = mimeType.toLowerCase().replace(/^image\/jpg$/, 'image/jpeg');
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  };
  if (!extensions[type]) throw new Error('Chỉ hỗ trợ định dạng JPG, PNG hoặc WebP.');
  if (!blob.size) throw new Error('Không đọc được dữ liệu ảnh. Vui lòng chọn lại ảnh.');
  if (blob.size > MAX_PROGRESS_PHOTO_BYTES) throw new Error('Ảnh không được vượt quá 5 MB.');

  // Local URI responses can carry an empty or generic MIME type.
  // The server validates the multipart file type, not picker metadata.
  const image = blob.slice(0, blob.size, type);
  const form = new FormData();
  form.append('image', image, `progress_${Date.now()}.${extensions[type]}`);
  return form;
}
