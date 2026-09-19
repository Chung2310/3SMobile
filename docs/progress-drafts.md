# Bản nháp tiến độ buổi tập

Trong Tiến độ khách hàng, PT mở Ghi nhận buổi tập. Mỗi thay đổi được tự lưu trên thiết bị theo tài khoản PT và học viên. Khi mở lại màn hình, bản cache chưa đồng bộ được tự khôi phục nếu mới hơn bản nháp trên máy chủ. Nút ghi nhận buổi tập và **Tiếp tục bản nháp** đều mở lại nội dung này. Chọn **Lưu bản nháp** để đồng bộ lên máy chủ. Mỗi PT có một bản nháp cho mỗi khách hàng được phân công.

Nháp giữ kết quả bài/hiệp còn thiếu, ghi chú, cảm nhận, số đo, ảnh đã tải lên và chữ ký. Cache tự lưu trên thiết bị; lưu bản nháp lên máy chủ vẫn cần kết nối mạng. Cache được xóa sau khi đồng bộ bản nháp hoặc lưu buổi tập chính thức thành công.

**Lưu chính thức** kiểm tra dữ liệu đầy đủ và đi qua API buổi tập hiện có. Lưu nháp không tạo lịch sử buổi tập, số đo, ảnh tiến độ hay trừ buổi gói tập. Khi giáo án thay đổi, cần xác nhận áp dụng giáo án mới; kết quả bài/hiệp được đặt lại, các thông tin khác được giữ.

## Backend đi kèm

Cần triển khai đồng thời thay đổi ở `3S-Gym/backend`: model `WorkoutSessionDraft`, service `workoutSessionDraftService`, router `workoutSessionDrafts` và đăng ký router trong `app.ts`.

- `GET /api/workout-session-drafts/:customerId`: bản nháp của người đăng nhập hoặc null.
- `PATCH /api/workout-session-drafts/:customerId`: `{ revision, idempotencyKey, form, plan, pendingPayload }`. Tạo mới với revision 0; cập nhật với revision nhận từ server. Trả 409 nếu bản nháp đã thay đổi.
- `DELETE /api/workout-session-drafts/:customerId?revision=N`: xóa đúng phiên bản.

API yêu cầu xác thực, quyền PT/admin, feature PROGRESS và quyền truy cập khách hàng. Unique index `(ownerId, customerId)` bảo vệ tạo trùng. Trước khi gửi buổi tập chính thức, mobile lưu payload và khóa idempotency vào nháp để có thể thử lại an toàn. GET dọn nháp có khóa đã xuất hiện trong lịch sử buổi tập, kể cả khi phản hồi lưu trước đó bị mất.

## Kiểm tra

- Mobile: `npm run typecheck`, ESLint các file đổi, `npm test`.
- Backend: `npm run typecheck:backend`, Oxlint các file đổi, `npx vitest run --config vitest.config.ts backend/tests/workoutSessionDraftApi.test.ts`.
- Cần kiểm tra thêm trên thiết bị thật: nhập vài hiệp → lưu nháp → đóng/mở app → tiếp tục → lưu chính thức; mất mạng khi lưu; giáo án thay đổi; ảnh/chữ ký và bàn phím trên iOS/Android.