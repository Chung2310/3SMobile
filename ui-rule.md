# UI RULES — Mobile App Design System
> File quy tắc bắt buộc cho AI Agent khi thiết kế / sinh giao diện mobile app.
> Agent PHẢI tuân thủ 100% các quy tắc dưới đây trong mọi màn hình, mọi component.

---

## 0. DESIGN TOKENS / APP CONFIG (Cấu hình riêng cho từng App)
> *Chỉ cần thay đổi block cấu hình này khi chuyển sang dự án hoặc app mới:*

- **Primary Brand Color**: `#2563EB` *(Ví dụ: Xanh dương chủ đạo - đổi mã màu theo brand)*
- **Font Family**: `Inter` *(Mặc định; thay đổi nếu dự án yêu cầu font khác)*
- **Default Icon Set**: `Lucide` *(line icon; stroke-width: 1.5–2px xuyên suốt)*
- **Corner Style Level**: `Soft`
  - *Soft (B2C, Friendly)*: Card 16–20px | Button 12–16px | Sheet 24px
  - *Subtle (B2B, Fintech, Data-dense)*: Card 10–12px | Button 8–10px | Sheet 16–20px
- **Platform Base**: Mobile Native (iOS / Android)

---

## 1. Nguyên tắc chung

- **KHÔNG dùng emoji** (❌ 🎉 👍 ✅ 🚀...) ở bất kỳ đâu trong UI: text, label, thông báo, tiêu đề, nút bấm.
- Mọi biểu tượng minh họa **bắt buộc dùng icon library** từ bộ icon đã cấu hình ở Mục 0. Tuyệt đối không trộn lẫn nhiều bộ icon khác nhau trong một app.
- **Xử lý Safe Area**: Mọi màn hình gốc đều phải được bọc trong SafeArea (SafeAreaView / padding an toàn), tránh để nội dung bị đè bởi Status Bar, Tai thỏ / Dynamic Island hoặc Home Indicator ở cạnh dưới.
- Thiết kế theo hướng **tối giản, nhất quán, dễ quét mắt** (clean, consistent, scannable).
- Ưu tiên **rõ ràng hơn màu mè**: Mọi trạng thái (thành công / lỗi / cảnh báo / đang tải) phải thể hiện bằng **icon + màu sắc + text rõ nghĩa**, không dùng màu sắc đơn lẻ.

---

## 2. Typography & Xử lý Text

- **Font chữ**: Sử dụng font cấu hình ở Mục 0 (mặc định Inter) cho toàn bộ app.
- Hệ thống cỡ chữ chuẩn:

  | Cấp | Kích thước | Weight | Dùng cho |
  |---|---|---|---|
  | Display | 28–32px | Bold (700) | Tiêu đề màn hình lớn |
  | H1 | 22–24px | SemiBold (600) | Tiêu đề section |
  | H2 | 18–20px | SemiBold (600) | Tiêu đề card |
  | Body | 14–16px | Regular (400) | Nội dung chính |
  | Caption | 12–13px | Regular/Medium | Ghi chú, label phụ |
  | Button text | 14–16px | SemiBold (600) | Text trong nút bấm |

- Line-height tối thiểu 1.4x cỡ chữ để dễ đọc.
- Không dùng chữ in hoa toàn bộ (ALL CAPS), trừ tag hoặc badge rất ngắn (dưới 6 ký tự).
- **Text Truncation & Overflow**: Mọi chuỗi text lấy từ API hoặc dynamic text trong Card, List Item, Header phải khai báo giới hạn dòng tối đa (`numberOfLines` / line-clamp) kèm thuộc tính cắt đuôi (`ellipsis`), không để text dài làm bung vỡ layout.

---

## 3. Bo góc (Border Radius)

Tuân thủ cấp độ bo góc (Corner Style) đã cấu hình ở Mục 0. Mặc định cấp độ **Soft**:

| Thành phần | Radius gợi ý |
|---|---|
| Card / Container nội dung | 16–20px |
| Popup / Modal | 20–24px |
| Bottom sheet | 20–28px (chỉ bo 2 góc trên) |
| Button | 12–16px (hoặc 999px cho full-pill button) |
| Input field | 12px |
| Avatar | Full-round (50% / circle) |
| Image thumbnail | 12–16px |
| Tag / Badge | Full-round hoặc 8px |

> Tuyệt đối không dùng góc nhọn (radius = 0) cho container, trừ trường hợp đặc thù như banner full-bleed sát mép màn hình.

---

## 4. Icon chuẩn hệ thống

- Đảm bảo stroke-width nhất quán trong toàn app (1.5–2px).
- Kích thước chuẩn: 16px (small), 20–24px (default/action), 32px+ (feature icon nổi bật).
- **Icon trạng thái bắt buộc (Semantic Icons)**:
  - **Thành công (Success)**: Icon Check trong vòng tròn, màu xanh lá (`#22C55E`).
  - **Thất bại / Lỗi (Error)**: Icon X trong vòng tròn, màu đỏ (`#EF4444`).
  - **Cảnh báo (Warning)**: Icon Chấm than (!) trong tam giác/vòng tròn, màu vàng cam (`#F59E0B`).
  - **Thông tin (Info)**: Icon chữ "i" trong vòng tròn, màu xanh dương (`#3B82F6`).

---

## 5. Popup / Modal / Dialog

- Bo tròn góc theo quy định ở Mục 3.
- Popup báo kết quả (thành công / lỗi):
  1. Icon trạng thái căn giữa phía trên (Check xanh / X đỏ theo Mục 4).
  2. Tiêu đề ngắn gọn, rõ nghĩa (VD: "Đã lưu thành công", "Không thể hoàn tất").
  3. Mô tả ngắn 1–2 dòng.
  4. Nút hành động chính full-width.
- Popup xác nhận (Confirm Dialog): Bắt buộc có 2 nút phân tách rõ cấp bậc: **Hủy** (Secondary/Outline) và **Xác nhận** (Primary/Destructive).
- Nút đóng (nếu có): Dùng icon **X** ở góc trên bên phải, kích thước 20–24px (không dùng chữ "Đóng").
- Overlay nền: Lớp phủ tối bán trong suốt (đen mờ 40–60% opacity).

---

## 5B. Bottom Sheet (Thay thế hoàn toàn Dropdown trên Mobile)

**Tuyệt đối KHÔNG dùng dropdown kiểu web** (thẻ `<select>` mặc định, popover nhỏ xổ xuống gây che khuất). Mọi thao tác chọn lựa, menu hành động, bộ lọc đều chuyển đổi sang **Bottom Sheet**.

**Áp dụng Bottom Sheet cho:**
- Single-select picker (chọn quốc gia, danh mục, trạng thái, ngày giờ...).
- Multi-select, bộ lọc nâng cao (filter/sort).
- Menu hành động của item (Action sheet: Sửa, Xóa, Chia sẻ thay cho context menu 3 chấm).

**Cấu trúc Bottom Sheet chuẩn:**
1. **Handle bar**: Thanh ngang nhỏ bo tròn (~36x4px, màu xám nhạt) ở giữa mép trên cùng.
2. **Header**: Tiêu đề ngắn (căn trái hoặc giữa), nút đóng icon **X** ở góc phải (không dùng chữ).
3. **Nội dung danh sách**: Mỗi item có chiều cao tối thiểu 48px để đảm bảo vùng chạm.
4. **Footer cố định (nếu là filter/multi-select)**: Nút Primary "Áp dụng" full-width và nút Secondary "Đặt lại".

**Quy tắc hiển thị & UX:**
- Chỉ bo tròn **2 góc trên** (20–28px), 2 góc dưới vuông áp sát mép màn hình.
- Overlay tối phía sau (40–60% opacity), chạm overlay hoặc vuốt xuống (swipe down) để đóng sheet.
- Chiều cao tự động co theo nội dung (tối đa 85–90% màn hình). Nếu nội dung dài, cho phép cuộn bên trong và giữ cố định header/footer.
- Danh sách > 8 mục: Bắt buộc thêm ô tìm kiếm nhanh ở đầu sheet.
- Item đang chọn: Đánh dấu bằng **icon check** màu Primary ở cuối dòng.
- Chừa **Safe Area đáy** tối thiểu 16–20px để không đè vào thanh điều hướng hệ thống.
- **Không lồng sheet trong sheet**: Nếu có phân cấp nhiều bước, điều hướng chuyển trang bên trong cùng một sheet (kèm nút back icon mũi tên ở góc trái header).
- **Trigger field** (ô bấm mở sheet): Thiết kế như input field, có icon chevron-down ở mép phải.

---

## 6. Card & Containers

- Bo tròn góc theo Mục 3.
- Dùng viền mỏng 1px màu nhạt (`#E2E8F0` / `#F1F5F9`) hoặc đổ bóng rất nhẹ (soft shadow) để tách khỏi nền.
- Padding nội dung bên trong card: Tối thiểu 12–16px.
- Card có thể bấm được (clickable): Phải có hiệu ứng phản hồi khi chạm (pressed state / active opacity).

---

## 7. Màu sắc & Hệ thống Semantic

- Bảng màu chuẩn:
  - **Primary**: Lấy theo cấu hình Mục 0 (màu thương hiệu).
  - **Success**: `#22C55E`
  - **Error / Destructive**: `#EF4444`
  - **Warning**: `#F59E0B`
  - **Info**: `#3B82F6`
  - **Neutral / Background**: Thang xám rõ ràng cho Surface, Background, Border và Text.
- Không bao giờ thể hiện trạng thái chỉ bằng màu nền/viền — luôn đi kèm icon hoặc nhãn text để đảm bảo accessibility cho người mù màu.

---

## 8. Button & Touch Target

- Border radius theo Mục 3.
- Cung cấp đủ 3 phân cấp nút:
  - **Primary**: Nền màu Primary, chữ tương phản cao.
  - **Secondary**: Nền nhạt/xám hoặc viền outline.
  - **Ghost / Text**: Không nền, dùng cho thao tác phụ hoặc liên kết.
- Chiều cao nút bấm: Tối thiểu 44–48px để đảm bảo chuẩn touch target trên mobile.
- Trạng thái nút: Default, Pressed, Disabled, Loading (khi loading: disable nút và hiển thị spinner nhỏ màu tương phản thay thế text).

---

## 9. Spacing & Grid System

- Tuân thủ hệ thống spacing theo bội số của 4px (4, 8, 12, 16, 20, 24, 32px...).
- Padding mép màn hình (screen horizontal padding): 16–20px.
- Khoảng cách giữa các section / card dọc: 12–16px.

---

## 10. Input & Form Fields

- Border radius: 12px (hoặc theo cấu hình Mục 0). Chiều cao chuẩn 48px.
- Focus state: Viền chuyển sang màu Primary rõ ràng.
- Error state: Viền đỏ + icon cảnh báo nhỏ bên phải input + dòng text thông báo lỗi màu đỏ ngay bên dưới.
- Placeholder text ngắn gọn, màu xám nhạt, biến mất khi người dùng gõ.

---

## 10B. Loading, Data Fetching & Layout Shift

**Nguyên tắc cốt lõi**: Tuyệt đối không để màn hình render khung trống rác, số 0 ảo, rồi 2–3 giây sau mới nhảy dữ liệu vào làm giật layout (layout shift).

### Phân định chuẩn các kiểu Loading:

1. **Skeleton Loading (Ưu tiên hàng đầu cho màn hình xem dữ liệu)**:
   - Áp dụng khi chuyển trang tới danh sách, profile, dashboard, feed.
   - Chuyển màn hình ngay lập tức, hiển thị các khối xám nhạt bo tròn (radius 8–12px) với hiệu ứng shimmer (1–1.5s/chu kỳ) tại đúng vị trí và kích thước của nội dung thật.
   - Khi API trả về, chuyển từ skeleton sang dữ liệu thật bằng hiệu ứng fade-in nhẹ (150–200ms).
2. **Full-screen Loading (Chỉ dùng khi bắt buộc phải chặn toàn bộ giao diện)**:
   - Dùng cho: Splash screen khi khởi động app, hoặc quá trình đồng bộ/xác thực tài khoản lúc đăng nhập ban đầu.
   - Cấu trúc căn giữa hoàn toàn:
     - **Circular Spinner**: Vòng xoay khuyết màu Primary brand, vòng nền mờ (15–20% opacity). Kích thước 36–40px, stroke-width 3–4px bo tròn hai đầu, xoay mượt 0.8–1s/vòng.
     - **Text thông báo**: Đặt dưới spinner cách 12–16px, font cỡ 14px Medium, màu xám phụ. Ghi rõ: "Đang tải dữ liệu" (hoặc "Loading" nếu app tiếng Anh). Không dùng emoji, không dùng ba chấm động rườm rà.
3. **Button Loading**: Áp dụng khi submit form/thanh toán — thay text bằng spinner nhỏ, khóa bấm để chống duplicate request.
4. **Inline Spinner / Load more**: Khi cuộn vô tận để tải thêm danh sách hoặc pull-to-refresh.

### Xử lý thời gian chờ & Ngoại lệ:
- `< 300ms`: Không hiển thị loader để tránh chớp giật màn hình nếu mạng quá nhanh.
- `> 10s`: Bổ sung thông điệp kiểm tra kết nối mạng và nút bấm "Thử lại" hoặc "Hủy".
- **Empty State**: Nếu API trả về mảng rỗng, hiển thị minh họa bằng icon phù hợp (không emoji) + tiêu đề ngắn + 1 câu hướng dẫn + nút kêu gọi hành động (CTA).
- **Error State**: Nếu API lỗi, hiển thị icon lỗi/mất mạng + câu mô tả thân thiện + nút "Thử lại".

---

## 11. Chuyển động (Motion & Animation)

- Thời lượng: Ngắn và dứt khoát (150–300ms). Dùng easing chuẩn (`ease-out` hoặc `ease-in-out`).
- Bottom sheet trượt lên (`slide-up`) từ đáy; Dialog dùng `fade` kết hợp `scale` nhẹ (0.95 -> 1.0).
- Tránh các hiệu ứng chuyển động lòe loẹt làm chậm thao tác người dùng.

---

## 12. Accessibility & Usability

- Tỷ lệ tương phản giữa text và nền đạt chuẩn tối thiểu WCAG AA (≥ 4.5:1 cho body text).
- Mọi vùng chạm (button, icon button, item) đảm bảo diện tích tối thiểu 44x44px.
- Các icon quan trọng dạng chỉ có biểu tượng phải có thuộc tính `accessibilityLabel` phục vụ trình đọc màn hình.

---

## 13. Checklist tự kiểm tra dành cho Agent trước khi xuất UI/Code

- [ ] Block **DESIGN TOKENS (Mục 0)** đã được đọc và áp dụng đúng màu brand/font.
- [ ] Mọi màn hình gốc đều có bọc **SafeArea** đầy đủ (không dính status bar, tai thỏ, home bar).
- [ ] Tuyệt đối **không có emoji** nào trong code/giao diện.
- [ ] Tất cả icon đều thuộc **cùng 1 bộ icon set duy nhất** đã chỉ định.
- [ ] Không có dropdown kiểu web (`<select>`); toàn bộ selection/filter đều dùng **Bottom Sheet**.
- [ ] Bottom sheet có **handle bar**, bo góc trên, chừa safe area đáy và hỗ trợ vuốt để đóng.
- [ ] Tất cả Card, Container, Input, Button đều được bo góc nhất quán.
- [ ] Text động có khai báo `numberOfLines` / line-clamp và xử lý cắt đuôi `ellipsis`.
- [ ] Không có màn hình nào bị layout shift hoặc hiện trắng: Đã áp dụng **Skeleton** hoặc **Loading**.
- [ ] Đầy đủ 3 trạng thái biên cho mọi luồng dữ liệu: **Loading**, **Error** (có nút Thử lại), và **Empty State** (kèm CTA).
- [ ] Spacing tuân thủ bội số của 4px; touch target tối thiểu 44px.