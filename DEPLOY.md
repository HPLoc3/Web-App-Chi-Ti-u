# Deploy lên Render + Neon (chitieu.hophuloc.online)

App chạy bằng Docker trên Render, database là Postgres trên Neon, đường dẫn gốc `/`. `DEPLOYMENT.md` là tài liệu VPS cũ.

> Lưu ý: `.github/workflows/cd.yml` (deploy lên VPS cũ, đã hết hạn) đã tắt tự chạy, push lên `main` không kích hoạt nó. Workflow chỉ còn chạy tay (`workflow_dispatch`); đừng chạy vì VPS cũ không còn dùng.

## 1. Neon
1. Tạo project (Postgres 16, region Singapore).
2. Mở **Connect**, lấy 2 chuỗi kết nối (giữ `sslmode=require`):
   - **Pooled** (bật Connection pooling, host có `-pooler`): dùng cho `DATABASE_URL`.
   - **Direct** (tắt pooling): dùng cho `DIRECT_URL`.
3. Thêm `&connect_timeout=15` vào **cả** `DATABASE_URL` và `DIRECT_URL` (Neon khởi động nguội cần thời gian).
4. Nếu log báo lỗi `prepared statement`, thêm `&pgbouncer=true` vào cuối `DATABASE_URL`.

## 2. Render
1. **New > Blueprint**, chọn repo GitHub. Render đọc `render.yaml` (nhánh `main`, nên code phải được push trước).
2. Nhập các biến được hỏi (không bọc dấu nháy):

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | Neon pooled |
| `DIRECT_URL` | Neon direct |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | 2 chuỗi ngẫu nhiên khác nhau. Tạo bằng `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `RESEND_API_KEY` | API key của Resend |
| `EMAIL_FROM` | `Sổ Tay Chi Tiêu <no-reply@hophuloc.online>` |
| `GEMINI_API_KEY` | key Gemini (để trống nếu chưa dùng AI) |
| `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` | cùng một Client ID |
| `GOOGLE_CLIENT_SECRET` | Client secret |

`NODE_ENV`, `PORT`, `APP_URL`, `ALLOWED_ORIGINS` đã có sẵn trong `render.yaml`.

3. Khi container khởi động, `prisma migrate deploy` chạy trước (dùng `DIRECT_URL`), sau đó mới start app. Migration lỗi thì app không start, xem tab **Logs**.
4. Đổi `VITE_GOOGLE_CLIENT_ID` thì phải **build lại** (Manual Deploy), restart không đủ.

## 3. Tên miền
1. Render > service > **Settings > Custom Domains**: kiểm tra có `chitieu.hophuloc.online` (thêm nếu chưa có), xem đích CNAME (dạng `<ten-service>.onrender.com`).
2. Cloudflare > `hophuloc.online` > **DNS**: thêm `CNAME`, Name `chitieu`, Target là địa chỉ onrender.com ở trên, **DNS only (mây xám)**. Xoá bản ghi A/AAAA cũ trùng tên `chitieu` nếu có.
3. Quay lại Render bấm **Verify**, chờ cấp chứng chỉ SSL.
4. Nên giữ DNS only. Nếu sau này bật proxy (mây cam), đặt SSL/TLS mode là **Full (strict)**.
5. (Tùy chọn) Link cũ `hophuloc.online/app_chi_tieu`: nếu tên miền gốc còn đi qua Cloudflare (bản ghi được proxy), tạo **Redirect Rule** chuyển sang `https://chitieu.hophuloc.online/` và giữ query string. App chỉ tự chuyển hướng `/app_chi_tieu/*` trên chính subdomain mới.

## 4. Resend
1. **Domains > Add domain** `hophuloc.online`.
2. Thêm đúng các bản ghi Resend hiển thị (SPF: TXT và MX, DKIM) vào Cloudflare DNS, để **DNS only**. Không xoá bản ghi email đang dùng; mỗi tên host chỉ được có một bản ghi SPF.
3. Chờ trạng thái **Verified**, tạo API key quyền gửi mail, điền `RESEND_API_KEY`.

## 5. Google OAuth
Google Cloud Console > **APIs & Services > Credentials** > OAuth Client (Web):
- **Authorized JavaScript origins**: thêm `https://chitieu.hophuloc.online`
- **Authorized redirect URIs**: thêm `https://chitieu.hophuloc.online/auth/callback`. Luồng đăng nhập hiện tại (popup / ID token) chủ yếu cần origin; URI này để khớp với `src/utils/googleRedirect.ts`.

Thay đổi có thể mất vài phút mới có hiệu lực.

## 6. Kiểm tra sau deploy
- `https://chitieu.hophuloc.online/health/live` trả `"status":"alive"`.
- `/health/ready` trả `"database":"connected"`.
- Trang chủ tải đủ giao diện; F12 không có lỗi 404 ở `/assets/...`.
- Đăng ký tài khoản mới, đăng xuất, đăng nhập lại, thêm một giao dịch.
- Đăng nhập Google.
- Quên mật khẩu: nhận được email (xem cả Spam, và Resend > Logs), link trỏ về `https://chitieu.hophuloc.online/?action=reset-password&token=...`, đổi mật khẩu thành công.
- CSRF: lệnh sau phải trả `403` (mã lỗi `CSRF_ORIGIN_DENIED`):
  ```
  curl -i -X POST https://chitieu.hophuloc.online/api/v1/auth/logout -H "Origin: https://hophuloc.online"
  ```
  Đổi Origin thành `https://chitieu.hophuloc.online` thì phải trả `200`. Trên PowerShell dùng `curl.exe`.
- API chỉ nhận origin của app (so khớp chính xác theo `ALLOWED_ORIGINS`, `APP_URL` hoặc trùng Host); web ở `hophuloc.online` không gọi được API. Cookie đăng nhập dùng `SameSite=Lax`.
- **Bắt buộc:** đạt bước kiểm IP ở mục 7 **trước khi go-live**.

## 7. Kiểm IP client (phải đạt trước khi go-live)
Nếu `TRUST_PROXY_HOPS` quá nhỏ, `req.ip` là IP proxy nên nhiều người dùng chung hạn mức. Nếu quá lớn, client giả được `X-Forwarded-For` để né rate limit.

1. Render > **Environment**: đặt `DEBUG_CLIENT_IP=true` (chỉ bật khi đúng chuỗi `true` chữ thường; `TRUE` hay `1` không có tác dụng), lưu và deploy lại.
2. Từ 2 mạng khác nhau (ví dụ Wi-Fi và 4G), mở `https://chitieu.hophuloc.online/api/ip-check` (trả 404 là bình thường, request vẫn được ghi log; không dùng `/api/health` vì không được log). Đồng thời xem IP công khai của từng mạng (ví dụ tại whatismyip).
3. Render > **Logs**, tìm `DEBUG_CLIENT_IP`: xem `reqIp`, `trustProxyHops`, `xForwardedFor`.
4. **Đạt** khi `reqIp` của mỗi mạng đúng bằng IP công khai của mạng đó. Nếu sai, đặt `TRUST_PROXY_HOPS` bằng vị trí của IP công khai trong `xForwardedFor`, **đếm từ phải sang** (ngoài cùng bên phải là 1), rồi kiểm lại.
5. Thử giả mạo: `curl -H "X-Forwarded-For: 1.2.3.4" https://chitieu.hophuloc.online/api/ip-check`. `reqIp` vẫn phải là IP thật, không được là `1.2.3.4`.
6. Ghi số hop đúng vào `TRUST_PROXY_HOPS` trong `render.yaml` rồi commit và push. Nếu chỉ sửa trên Dashboard, lần đồng bộ Blueprint sau sẽ ghi đè về giá trị trong file.
7. Xong thì đặt `DEBUG_CLIENT_IP=false` và deploy lại (log chứa IP người dùng).

Bật/tắt Cloudflare proxy làm đổi số hop, khi đó phải kiểm lại.

## 8. Gói free
- Render free **ngủ** sau khoảng 15 phút không có request; lần truy cập kế tiếp chờ khoảng 1 phút. Muốn chạy liên tục thì nâng gói trả phí.
- Neon free cũng tạm dừng khi rảnh, truy vấn đầu tiên chậm hơn một chút.
- Giới hạn của gói free có thể thay đổi, xem trang giá của Render và Neon.
