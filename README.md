# 3S Gym Mobile

Customer-facing native app built with Expo, React Native and Expo Router.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

For a physical device, set `EXPO_PUBLIC_API_URL` to the backend address reachable from the same network, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3008
```

The app currently supports customer login, journey overview, workouts, nutrition plans, progress/InBody data, schedule, in-app notifications and profile/logout. Data is read from the existing `/api` endpoints and the JWT is stored in Expo SecureStore.

## Checks

```bash
npm run typecheck
npm run lint
```

## Build with EAS

```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

Customer write actions, device-token push notifications and offline mutation queues are intentionally left for the next backend/mobile phase.

## Giáo án mobile

Tab **Giáo án** dùng chung API với dự án web `E:/Igen/3S-Gym`.

- **PT:** tìm/lọc giáo án mẫu; tạo nhiều buổi và bài tập; chỉnh thông số; lưu trữ/xóa giáo án mẫu đã lưu trữ. Trong mục **Khách hàng**, chọn khách để gán/thay giáo án, sửa bản riêng, công bố/thu hồi hoặc xem lịch sử.
- **Admin:** xem và sửa giáo án hiện hành của khách, công bố/thu hồi, xem lịch sử. Thư viện mẫu và thao tác gán mẫu dành cho PT theo quyền API hiện có.
- **Khách hàng:** xem giáo án đã công bố, chọn buổi/ngày và xem các giáo án lịch sử đã công bố. Bản nháp được lọc khỏi giao diện.
- Hỗ trợ thông số sức mạnh, trọng lượng cơ thể, cardio, interval và mobility. Lịch Studio được đọc theo tuần/ngày/giờ; chỉnh thông số trên mobile giữ nguyên lịch và các bài chưa xếp lịch. Tạo hoặc kéo thả khung giờ Studio và sinh giáo án AI vẫn thực hiện trên web.
- Thay giáo án gọi API gán hiện có: giáo án cũ chuyển vào lịch sử, giáo án mới là bản nháp và cần công bố. Lỗi API được hiển thị trực tiếp, không thay bằng dữ liệu demo.

### Kiểm tra giáo án

Lockfile hiện tại được cài bằng `npm ci --legacy-peer-deps`.

```bash
npm run typecheck
node --test tests/workouts.test.cjs
npx eslint src/services/workouts.ts src/components/workouts "src/app/(app)/(tabs)/workouts.tsx"
npx expo export --platform android --output-dir dist/android
```

Kiểm tra tích hợp khi có backend và tài khoản thử nghiệm:

1. Đăng nhập PT, mở Giáo án, tạo mục tiêu/cấp độ và hai buổi với các kiểu bài tập khác nhau. Lưu, mở lại và đối chiếu trên web.
2. Chọn khách được phân công, gán mẫu; kiểm tra bản nháp chưa xuất hiện ở tài khoản khách. Công bố và tải lại phía khách.
3. Sửa mức tạ/cardio, tải lại web và mobile để kiểm tra giá trị đồng nhất. Thay mẫu và kiểm tra giáo án cũ trong lịch sử.
4. Thu hồi công bố rồi tải lại phía khách; lưu trữ/xóa mẫu đã lưu trữ và kiểm tra bản riêng của khách vẫn tồn tại.
5. Kiểm tra giáo án Studio có cùng ngày ở hai tuần, bài chưa xếp lịch, mất mạng, danh sách trống và quyền của PT khác.

Bundle export kiểm tra đóng gói JavaScript/assets, không thay thế kiểm thử trên thiết bị hoặc tạo APK.


## Thư viện bài tập

- Mở **Giáo án → Thư viện bài tập** (PT/Admin). Tìm tên, lọc nhóm cơ/cấp độ/cách ghi nhận và chuyển trang từ API.
- Xem mô tả, kỹ thuật, thiết bị, lỗi thường gặp, chống chỉ định, biến thể và mở video bằng trình duyệt/ứng dụng của thiết bị.
- Tạo bài tập, chỉnh sửa/xóa khi API cấp `canManage`; quản lý nhóm cơ (thêm và xóa nhóm tùy chỉnh chưa có bài tập sử dụng). Hỗ trợ nhiều liên kết video, giữ các video upload có sẵn khi sửa.
- Trong form giáo án, chọn **Chọn từ thư viện** ở từng buổi; có thể thay bài hiện có hoặc thêm bài chưa xếp lịch cho giáo án Studio. Giữ mã bài tập và tạo thông số đúng loại như web. Bài chưa phân loại không thể chọn.
- Bộ lọc và chọn nhóm cơ dùng bottom sheet theo `ui-rule.md`. Chức năng khách hàng không được cấp quyền vào thư viện.
- Sinh bài tập bằng AI và upload video trực tiếp vẫn thực hiện trên web.

Kiểm tra: `node --test tests/workouts.test.cjs tests/exercises.test.cjs`. Khi có tài khoản backend, kiểm tra thêm luồng tạo/sửa/xóa, quyền của PT khác, chọn bài vào giáo án, video, tìm kiếm nhanh liên tục và lỗi mạng khi chuyển trang.

## Backend staging và lỗi không tìm thấy API

Dùng HTTPS trực tiếp cho staging trong `.env`:

```env
EXPO_PUBLIC_API_URL=https://staging-3s.igentechnology.net
```

Không thêm `/api` vào cuối URL vì các request đã có tiền tố này. Staging chuyển HTTP sang HTTPS bằng 301; request đăng nhập POST có thể chuyển thành GET và nhận `ROUTE_NOT_FOUND` dù route đăng nhập tồn tại.

Sau khi sửa `.env`, tải lại ứng dụng. Nếu Metro còn giữ cấu hình cũ, dừng Metro rồi chạy `npx expo start --clear`. Bản APK đã build cần build/cài lại hoặc nhận bản cập nhật bundle mới; sửa `.env` trên máy không thay đổi bundle đã cài.
## Tiến độ

Mở **Trang chủ → Tiến độ**. Màn InBody trong tab vẫn được giữ riêng.

- PT/Admin chọn khách từ API được phân quyền; khách hàng xem hành trình của mình. Lọc khoảng ngày cho lịch sử, số đo và thống kê.
- Tổng quan số buổi, điểm danh, chuỗi tuần, RPE; lịch tháng và kết quả từng buổi; biểu đồ chín chỉ số cơ thể; thành tích và ảnh tiến độ có sẵn.
- PT sở hữu giáo án đang áp dụng ghi nhận buổi tập theo đúng phiên bản và thứ tự buổi, hỗ trợ năm loại kết quả. Các giá trị thực tế ban đầu để trống. Xác nhận trước khi tính buổi vào gói, thử lại dùng cùng mã chống ghi trùng.
- PT/Admin thêm, sửa, xóa số đo nhập tay. Số đo đồng bộ InBody chỉ xem ở đây.
- PT/Admin tạo, sửa, xuất bản, thu hồi báo cáo và xóa bản nháp. Khách chỉ thấy báo cáo đã xuất bản. Báo cáo có kỳ riêng, không bị bộ lọc ngày của lịch tập ẩn đi.
- Upload ảnh, chữ ký buổi tập và sinh báo cáo tự động vẫn thực hiện trên web.

Kiểm tra tự động: `node --test tests/workouts.test.cjs tests/exercises.test.cjs tests/progress.test.cjs` và `npm run typecheck`.

Kiểm tra trên thiết bị với tài khoản staging: chọn khách, ghi một buổi có mặt/vắng, kiểm tra số buổi gói trên web; kiểm tra thử lại khi mạng gián đoạn; nhập số đo và xem biểu đồ; xuất bản/thu hồi báo cáo và đối chiếu tài khoản khách; đổi nhanh khách và khoảng ngày, kiểm tra tài khoản không được phân công. Không dùng tài khoản hoặc dữ liệu thật để thử trừ buổi.
