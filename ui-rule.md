# UI RULES — Mobile App Design System (3S GYM FITNESS STYLE)
> File quy tắc bắt buộc cho AI Agent khi thiết kế / sinh giao diện mobile app.
> Agent PHẢI tuân thủ 100% các quy tắc dưới đây trong mọi màn hình, mọi component.

---

## 0. DESIGN TOKENS / APP CONFIG (Chuẩn hóa phong cách Thể thao 3S Gym)

- **Primary Brand Color**: `#0284C7` *(Xanh da trời thể thao / Athletic Sky Blue — hiện đại, sang trọng, thanh lịch)*
- **Primary Dark / Pressed**: `#0369A1` *(Màu xanh da trời đậm khi bấm / viền active)*
- **Dark Accent / Action**: `#111827` *(Đen tuyền sâu cho các nút hành động tròn, tiêu đề mạnh mẽ)*
- **Backgrounds**:
  - `Background`: `#F8FAFC` *(Xám trắng sáng dịu mắt)*
  - `Surface / Card`: `#FFFFFF` *(Trắng tinh khiết tách lớp)*
  - `Surface Sub / Nested`: `#F3F4F6` *(Xám nhạt cho sub-card lồng bên trong)*
- **Font Families**:
  - **Display & Athletic Headings**: Font Condensed Sans-serif thể thao in hoa (như `Bebas Neue`, `Barlow Condensed`, `Oswald`, hoặc `Inter` Bold/Black với style Condensed/ALL CAPS).
  - **Body & UI Elements**: `Inter` *(Regular 400, Medium 500, SemiBold 600, Bold 700)*.
- **Default Icon Set**: `Lucide` / `@expo/vector-icons` *(line icon; stroke-width: 1.5–2px xuyên suốt)*
- **Corner Style Level**: `Soft`
  - *Card & Container*: 20–24px
  - *Sub-card / Thumbnail*: 14–16px
  - *Button*: 12–16px hoặc Nút tròn Action `44–48px` (Full-circle)
  - *Badge / Tag*: 6–8px bo nhẹ
  - *Sheet*: 24–28px (chỉ bo 2 góc trên)
- **Platform Base**: Mobile Native (iOS / Android)

---

## 1. Nguyên tắc chung

- **KHÔNG dùng emoji** (❌ 🎉 👍 ✅ 🚀...) ở bất kỳ đâu trong UI: text, label, thông báo, tiêu đề, nút bấm.
- Mọi biểu tượng minh họa **bắt buộc dùng icon library** từ bộ icon đã cấu hình ở Mục 0. Tuyệt đối không trộn lẫn nhiều bộ icon khác nhau trong một app.
- **Xử lý Safe Area**: Mọi màn hình gốc đều phải được bọc trong SafeArea (SafeAreaView / padding an toàn), tránh để nội dung bị đè bởi Status Bar, Tai thỏ / Dynamic Island hoặc Home Indicator ở cạnh dưới.
- Thiết kế theo hướng **thể thao, năng động, tối giản, tương phản cao, dễ quét mắt** (athletic, high-contrast, clean, scannable).
- Ưu tiên **rõ ràng hơn màu mè**: Mọi trạng thái (thành công / lỗi / cảnh báo / đang tải) phải thể hiện bằng **icon + màu sắc + text rõ nghĩa**, không dùng màu sắc đơn lẻ.

---

## 2. Typography & Kiểu Chữ Thể Thao (Athletic Typography)

### 2.1. Phân loại kiểu chữ đặc thù:
1. **Kiểu chữ Thể thao Mạnh mẽ (Athletic Condensed ALL CAPS)**:
   - Dùng cho: Tiêu đề màn hình chính (`ĐIỀU CHỈNH KẾ HOẠCH`, `LỊCH SỬ`, `TÔI`), Tiêu đề khóa tập luyện (`CƠ BẮP VÙNG TRÊN MẠNH MẼ`, `TOÀN BỘ CƠ THỂ MẠNH MẼ`), Nhãn cấp độ (`NGƯỜI BẮT ĐẦU`).
   - Đặc điểm: Font in hoa toàn bộ, chữ cao gọn, nét đậm, dứt khoát, mang lại cảm giác kỷ luật và năng lượng tập luyện bùng nổ.
2. **Kiểu chữ Số liệu Thống kê (Metric & Hero Numbers)**:
   - Dùng cho: Chỉ số đếm trên Profile (`0`, `67.2 kg`), thời lượng và số bài tập (`9 phút · 17 bài tập`), tiến độ (`0/28 Ngày`).
   - Đặc điểm: Font số to, nét đậm (Bold 700), màu đen tuyền tương phản cao.
3. **Kiểu chữ Nội dung & Giao diện (Inter Body UI)**:
   - Dùng cho: Mô tả bài tập, menu item, nhãn phụ, thông báo. Sử dụng font Inter thường, viết hoa chữ cái đầu câu, line-height 1.4–1.5x để đảm bảo độ đọc tối ưu.

### 2.2. Hệ thống cỡ chữ chuẩn:

| Cấp | Kích thước | Weight / Style | Dùng cho |
|---|---|---|---|
| **Athletic Display** | 26–30px | Bold/Black (Condensed ALL CAPS) | Tiêu đề màn hình thể thao lớn, Tiêu đề giáo án |
| **H1 (Section Title)** | 20–22px | Bold (700) | Tiêu đề khối (vd: `Tuần 1`, `Cân nặng`, `Tháng 9 2026`) |
| **H2 (Card Title)** | 17–19px | SemiBold/Bold | Tiêu đề thẻ ngày (`Ngày 1`, `Ngày 2`) |
| **Body Large** | 15–16px | Medium (500) | Nhãn menu cài đặt, tabbar, text nút bấm chính |
| **Body Regular** | 14–15px | Regular (400) | Nội dung mô tả giáo án, văn bản hướng dẫn |
| **Caption / Meta** | 12–13px | Regular/Medium | Thời lượng (`9 phút · 17 bài tập`), phụ đề, nhãn chỉ số |
| **Badge Text** | 11–12px | Bold (ALL CAPS) | Nhãn thời lượng (`4 TUẦN`), tag trạng thái |

- **Text Truncation & Overflow**: Mọi chuỗi text động từ API phải khai báo giới hạn dòng (`numberOfLines`) kèm `ellipsizeMode="tail"`, tránh tràn vỡ giao diện.

---

## 3. Bo góc (Border Radius) — Cấp độ Soft Sport

| Thành phần | Radius gợi ý |
|---|---|
| Card Kế hoạch chính / Card Lịch | 20–24px |
| Card Bài tập theo ngày (Day Card) | 20–24px |
| Thumbnail ảnh động tác tập | 14–16px |
| Sub-card lồng bên trong (Nested pill/card) | 12–16px |
| Nút Action tròn (Next/Start button) | 999px (Circle hoàn hảo) |
| Button tiêu chuẩn (Full-width Primary) | 14–16px |
| Badge / Tag thời lượng (`4 TUẦN`) | 6–8px |
| Bottom sheet | 24–28px (chỉ bo 2 góc trên) |
| Avatar người dùng | 999px (Full circle) |

---

## 4. Icon chuẩn hệ thống

- Đảm bảo stroke-width nhất quán trong toàn app (1.5–2px).
- Kích thước chuẩn: 16px (small), 20–24px (default/action), 32px+ (feature icon nổi bật).
- **Bộ Icon thể thao đặc trưng**:
  - `Dumbbell` (Kế hoạch / Bài tập), `Compass` (Khám phá), `Calendar` (Lịch sử), `User` (Tôi).
  - `ArrowRight` (trong nút tròn đen), `ArrowLeft` (Back navigation), `SlidersHorizontal` (Cài đặt / Điều chỉnh), `Pencil` (Sửa chỉ số).
- **Icon trạng thái bắt buộc (Semantic Icons)**:
  - **Thành công (Success)**: Icon Check trong vòng tròn, màu xanh lá (`#22C55E`).
  - **Thất bại / Lỗi (Error)**: Icon X trong vòng tròn, màu đỏ (`#EF4444`).
  - **Cảnh báo (Warning)**: Icon Chấm than (!) trong tam giác/vòng tròn, màu vàng cam (`#F59E0B`).
  - **Thông tin (Info)**: Icon chữ "i" trong vòng tròn, màu xanh dương (`#3B82F6`).

---

## 5. Cấu trúc Layout & Cách Sắp Xếp (Component Layouts)

### 5.1. Top Navigation & Segmented Tabs:
- **Header**: Nút Back mũi tên trái (touch target ≥ 44px) + Tiêu đề căn trái dạng `Athletic Condensed ALL CAPS`.
- **Segmented Filter Tabs** (ví dụ: `TẠI NHÀ` | `PHÒNG GYM` hoặc `Lịch` | `Thời lượng` | `Calo`):
  - Chữ tab active: Màu đen đậm, in hoa.
  - Tab indicator: Thanh gạch chân màu xanh lá `#22C55E` bo tròn 2 đầu, dày 3px, chiều rộng co theo chữ hoặc cố định gọn gàng ngay dưới tab active.
  - Chữ tab inactive: Màu xám trung tính (`#6B7280`).

### 5.2. Thẻ Kế Hoạch Tập Luyện Nổi Bật (Hero Plan Card):
- **Bao quanh**: Thẻ màu trắng bo góc 20–24px, có viền xanh lá thể thao dày 2px (`borderColor: '#22C55E'`).
- **Nửa trên**:
  - Góc trên trái: Badge thời lượng (`4 TUẦN`) nền xanh lá `#22C55E`, chữ trắng in hoa, bo góc 6–8px.
  - Dưới badge: Tiêu đề khóa tập lớn in hoa Athletic Display (`CƠ BẮP VÙNG TRÊN MẠNH MẼ`).
  - Bên phải: Hình ảnh người mẫu thể hình / vóc dáng cơ bắp được cắt viền hòa vào nền card.
- **Nửa giữa**: Đoạn mô tả ngắn lợi ích bài tập bằng font thường, màu xám (`#4B5563`).
- **Nửa dưới (Nested Sub-card)**:
  - Khối nền xám nhạt (`#F3F4F6`), bo góc 14–16px, padding 12–16px.
  - Hàng trên: Cấp độ tập (`NGƯỜI BẮT ĐẦU` in hoa) + nút bấm nhỏ dạng pill (`Điều chỉnh`).
  - Hàng giữa: Thanh tiến độ (Progress bar) với track xám và vạch tiến độ xanh lá / xám đậm.
  - Hàng dưới: Số ngày hoàn thành (ví dụ: `0/28 Ngày`).

### 5.3. Thẻ Bài Tập Theo Ngày (Day Workout Card):
- Bố cục dạng hàng ngang (Horizontal row), nền trắng bo góc 20–24px, viền mờ 1px `#E5E7EB` hoặc viền đen nhẹ.
- **Phần trái**: Thumbnail ảnh động tác tập vuông bo góc 14–16px (`width: 72–80px`, `height: 72–80px`).
- **Phần giữa**: Cột thông tin:
  - Tiêu đề ngày: `Ngày 1`, `Ngày 2` (Font H2 đậm, màu đen `#111827`).
  - Dòng phụ: Thời lượng & số bài (`9 phút · 17 bài tập`, màu xám `#6B7280`).
- **Phần phải**: Nút Action tròn đen (`backgroundColor: '#111827'`, kích thước 40–44px) chứa icon mũi tên trắng `ArrowRight` hướng sang phải.

### 5.4. Khối Cá Nhân & Chỉ Số (Profile & Metric Layout):
- **Header Profile**: Avatar tròn nền xanh lá `#22C55E` với chữ cái đầu màu trắng, bên dưới là tên người dùng.
- **Stats Counter (3 cột chỉ số)**:
  - 3 cột chia đều: `Lần tập` | `Kcal` | `Phút`.
  - Hàng trên là số đếm to đậm (Font 24–28px, Bold 700), hàng dưới là nhãn chú thích xám.
- **Nhóm Menu Cài Đặt**: Gom cụm trong Card trắng bo góc 20px, mỗi dòng có icon xanh lá `#22C55E` ở đầu và chevron `>` ở cuối.
- **Widget Cân Nặng**: Thẻ độc lập hiển thị cân nặng hiện tại to bản kèm mục tiêu và nút icon bút chì để cập nhật nhanh.

### 5.5. Bottom Navigation Bar:
- 4 Tabs chính: `Kế hoạch`, `Khám phá`, `Lịch sử`, `Tôi`.
- Tab đang chọn: Icon và nhãn màu xanh lá Primary (`#22C55E`), nhãn đậm nét.
- Tab không chọn: Icon và nhãn màu xám trung tính (`#9CA3AF`).

---

## 5C. CALENDAR COMPONENT (Quy chuẩn Lịch tập & Lịch sử hoạt động)

Màn hình Lịch sử tập luyện phải tích hợp bộ Calendar dạng tháng đồng bộ với thiết kế thể thao:

### 1. Cấu trúc tổng thể Calendar View:
- **Header Tháng/Năm**: Hiển thị tháng và năm hiện tại (`Tháng 9 2026`), font chữ SemiBold đậm vừa, căn giữa hoặc căn trái.
- **Sub-segmented Tabs**: Bộ lọc chuyển đổi chế độ xem: `Lịch` (mặc định) | `Thời lượng` | `Calo`, có gạch chân xanh lá dưới tab active.
- **Calendar Card**: Đóng gói toàn bộ lưới lịch trong Card nền trắng phẳng, bo góc 20–24px, padding 16–20px.

### 2. Hàng Thứ trong tuần (Weekdays Header):
- 7 cột tương ứng: `CN`, `Th 2`, `Th 3`, `Th 4`, `Th 5`, `Th 6`, `Th 7`.
- Màu chữ mặc định: Xám trung tính (`#6B7280`), font 13–14px Medium.
- **Highlight thứ hôm nay**: Cột thứ tương ứng với ngày hôm nay (ví dụ: `Th 3`) đổi sang màu **Xanh lá Primary (`#22C55E`)**.

### 3. Lưới Ngày trong tháng (Days Grid):
- Căn chỉnh dạng Grid 7 cột đồng đều, chiều cao hàng thoáng đãng (khoảng 40–44px/hàng).
- **Ngày bình thường**: Số ngày màu đen xám (`#1F2937`), font 15px Regular/Medium.
- **Ngày hôm nay (Current Day)**:
  - Số ngày chuyển sang màu **Xanh lá Primary (`#22C55E`)**, font SemiBold.
  - Ngay bên dưới số ngày có **dấu chấm tròn nhỏ màu xanh lá (Indicator Dot)** đường kính 4px.
- **Ngày đã hoàn thành bài tập (Completed Workout Day)**:
  - Hiển thị chấm tròn xanh lá hoặc vòng tròn bao quanh ngày để đánh dấu chuỗi tập luyện (streak).
- **Ngày không thuộc tháng hiện tại**: Hiển thị mờ (`#D1D5DB`) hoặc để trống.

### 4. Khối Tóm Tắt Hoạt Động & Empty State (Activity Summary):
- Ngay dưới Card Lịch là Card tóm tắt tháng: Tiêu đề `Tháng 9 2026`, phụ đề `0 Hoạt động`.
- **Trạng thái chưa có lịch sử (Empty State)**:
  - Icon minh họa: Huy chương vàng thành tích (Medal icon) hoặc Trophy icon ở giữa.
  - Đoạn văn bản mô tả thân thiện: *"Hồ sơ tập luyện sẽ hiển thị ở đây. Ngoài ra, bạn có thể ghi lại các hoạt động của riêng bạn!"* (Màu xám `#6B7280`, căn giữa).

---

## 5B. Bottom Sheet (Thay thế hoàn toàn Dropdown trên Mobile)

**Tuyệt đối KHÔNG dùng dropdown kiểu web** (thẻ `<select>` mặc định, popover nhỏ xổ xuống gây che khuất). Mọi thao tác chọn lựa, menu hành động, bộ lọc đều chuyển đổi sang **Bottom Sheet**.

**Áp dụng Bottom Sheet cho:**
- Single-select picker (chọn mục tiêu, cấp độ tập, bài tập...).
- Multi-select, bộ lọc nâng cao (filter/sort).
- Menu hành động của item (Action sheet: Sửa, Xóa, Chia sẻ thay cho context menu 3 chấm).

**Cấu trúc Bottom Sheet chuẩn:**
1. **Handle bar**: Thanh ngang nhỏ bo tròn (~36x4px, màu xám nhạt) ở giữa mép trên cùng.
2. **Header**: Tiêu đề ngắn (căn trái hoặc giữa), nút đóng icon **X** ở góc phải (không dùng chữ).
3. **Nội dung danh sách**: Mỗi item có chiều cao tối thiểu 48px để đảm bảo vùng chạm.
4. **Footer cố định (nếu là filter/multi-select)**: Nút Primary "Áp dụng" full-width màu xanh lá `#22C55E` và nút Secondary "Đặt lại".

**Quy tắc hiển thị & UX:**
- Chỉ bo tròn **2 góc trên** (24–28px), 2 góc dưới vuông áp sát mép màn hình.
- Overlay tối phía sau (40–60% opacity), chạm overlay hoặc vuốt xuống (swipe down) để đóng sheet.
- Danh sách > 8 mục: Bắt buộc thêm ô tìm kiếm nhanh ở đầu sheet.
- Item đang chọn: Đánh dấu bằng **icon check** màu Primary `#22C55E` ở cuối dòng.
- Chừa **Safe Area đáy** tối thiểu 16–20px để không đè vào thanh điều hướng hệ thống.

---

## 6. Màu sắc & Hệ thống Semantic

- Bảng màu chuẩn:
  - **Primary (Sport Green)**: `#22C55E`
  - **Primary Dark**: `#16A34A`
  - **Dark Action**: `#111827`
  - **Success**: `#22C55E`
  - **Error / Destructive**: `#EF4444`
  - **Warning**: `#F59E0B`
  - **Info**: `#3B82F6`
  - **Neutral / Background**:
    - App Background: `#F8FAFC`
    - Card Surface: `#FFFFFF`
    - Sub-surface: `#F3F4F6`
    - Border / Divider: `#E5E7EB`
    - Text Primary: `#111827`
    - Text Secondary: `#4B5563`
    - Text Muted: `#9CA3AF`
- Không bao giờ thể hiện trạng thái chỉ bằng màu nền/viền — luôn đi kèm icon hoặc nhãn text để đảm bảo accessibility cho người mù màu.

---

## 7. Button & Touch Target

- Cung cấp đủ các phân cấp nút:
  - **Primary Action (Sport Green)**: Nền `#22C55E`, chữ trắng, bo góc 14–16px, chiều cao 48–52px.
  - **Dark Action Button**: Nút tròn đen `#111827` kích thước 40–44px với icon mũi tên trắng ở góc các card ngày tập.
  - **Pill Button**: Nút nhỏ bo góc nhẹ nền `#F3F4F6` hoặc viền mờ cho nút phụ (như nút `Điều chỉnh`).
  - **Secondary / Outline**: Nền trong suốt, viền mỏng 1px `#E5E7EB`.
- Vùng chạm tối thiểu: Mọi nút bấm, icon button đạt tối thiểu **44x44px** (dùng `hitSlop` nếu icon nhỏ).
- Trạng thái nút: Default, Pressed (opacity 0.8 / scale 0.98), Disabled, Loading (hiển thị spinner nhỏ thay text).

---

## 8. Spacing & Grid System

- Tuân thủ hệ thống spacing theo bội số của 4px (4, 8, 12, 16, 20, 24, 32px...).
- Padding mép màn hình (screen horizontal padding): 16–20px.
- Khoảng cách giữa các section / card dọc: 12–16px.

---

## 9. Input & Form Fields

- Border radius: 12–14px. Chiều cao chuẩn 48–52px.
- Focus state: Viền chuyển sang màu Xanh lá Primary `#22C55E` rõ ràng.
- Error state: Viền đỏ + icon cảnh báo nhỏ bên phải input + dòng text thông báo lỗi màu đỏ ngay bên dưới.
- Placeholder text ngắn gọn, màu xám nhạt, biến mất khi người dùng gõ.

---

## 10. Loading, Data Fetching & Layout Shift

- **Skeleton Loading**: Hiển thị các khối xám nhạt bo tròn (radius 12–16px) shimmer tại đúng vị trí thẻ kế hoạch, thẻ ngày và calendar trong khi chờ API.
- **Full-screen Loading**: Vòng xoay khuyết màu xanh lá Primary `#22C55E`, căn giữa kèm text "Đang tải dữ liệu".
- **Button Loading**: Thay text bằng ActivityIndicator màu trắng, khóa bấm để chống double-submit.
- **Empty State**: Icon phù hợp (không emoji) + tiêu đề ngắn + 1 câu hướng dẫn + nút kêu gọi hành động (CTA).
- **Error State**: Icon lỗi/mất mạng + câu mô tả tiếng Việt thân thiện qua `messageOf()` + nút "Thử lại".

---

## 11. Checklist tự kiểm tra dành cho Agent trước khi xuất UI/Code

- [ ] Áp dụng đúng màu **Primary Sport Green (`#22C55E`)** và **Dark Accent (`#111827`)**.
- [ ] Mọi màn hình gốc đều có bọc **SafeArea** đầy đủ (không dính status bar, tai thỏ, home bar).
- [ ] Tiêu đề chính sử dụng **Athletic Condensed ALL CAPS**, tạo cảm giác thể thao, dứt khoát.
- [ ] Tuyệt đối **không có emoji** nào trong code/giao diện.
- [ ] Tất cả icon đều thuộc **cùng 1 bộ icon set duy nhất** (Lucide / Expo vector icons).
- [ ] Các Card kế hoạch có viền xanh lá 2px, badge thời lượng và khối sub-card lồng bên trong.
- [ ] Các Card ngày tập có thumbnail ảnh bo góc 14–16px bên trái và nút tròn đen mũi tên trắng bên phải.
- [ ] Component Calendar có đầy đủ hàng thứ (highlight thứ hôm nay bằng màu xanh lá), lưới 7 cột với dấu chấm indicator dot cho ngày hiện tại.
- [ ] Không có dropdown kiểu web (`<select>`); toàn bộ selection/filter đều dùng **Bottom Sheet**.
- [ ] Text động có khai báo `numberOfLines` và xử lý cắt đuôi `ellipsizeMode="tail"`.
- [ ] Đầy đủ 3 trạng thái: **Loading**, **Error** (có nút Thử lại), và **Empty State** (kèm CTA).
- [ ] Spacing tuân thủ bội số của 4px; touch target tối thiểu 44px.