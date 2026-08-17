# 🚀 Production Deployment & Operations Guide — Sổ Tay Chi Tiêu

Tài liệu hướng dẫn triển khai, vận hành, di chuyển cơ sở dữ liệu và khôi phục sự cố cho ứng dụng **Sổ Tay Chi Tiêu (Expense Ledger)** trên các môi trường Development, Staging và Production.

---

## 🏗️ 1. Production Architecture Overview

```text
[ Internet / Client Browser / Mobile Web ]
                    │  (HTTPS / TLS 1.3 / Port 443)
                    ▼
        ┌─────────────────────────┐
        │      Nginx Proxy        │  ◄── SSL Termination, Gzip, Rate Limiting,
        │  (hophuloc.online)      │      Static Asset Caching (/assets/*),
        └───────────┬─────────────┘      HTTP -> HTTPS Redirection (Port 80 -> 443)
                    │  (Internal HTTP / Port 3000)
                    ▼
        ┌─────────────────────────┐
        │   Node.js / Express     │  ◄── Server-Side API, Auth (JWT + Google OAuth),
        │  (Vite SPA + Backend)   │      Input Sanitization, Rate Limiter, Health Probes
        └─────┬─────────────┬─────┘
              │             │
 (SQL Queries)│             │ (HTTPS API Calls - Server Only)
              ▼             ▼
  ┌──────────────────┐   ┌──────────────────────┐
  │ PostgreSQL 16 DB │   │ Google Gemini AI API │
  │ (Data Store)     │   │ (Financial Assistant)│
  └──────────────────┘   └──────────────────────┘
```

### 🔒 Secret Boundary Rules:
* Các biến môi trường sau **TUYỆT ĐỐI KHÔNG BAO GIỜ** được đưa ra client hoặc prefix bằng `VITE_`:
  * `DATABASE_URL` / `POSTGRES_PASSWORD`
  * `JWT_SECRET` / `JWT_REFRESH_SECRET`
  * `GEMINI_API_KEY`
  * `GOOGLE_CLIENT_SECRET`

---

## 🌐 2. Environment Configuration Matrix

| Variable | Development | Staging | Production | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `staging` | `production` | Node runtime environment |
| `PORT` | `3000` | `3000` | `3000` | Server listening port |
| `APP_URL` | `http://localhost:3000` | `https://staging.hophuloc.online` | `https://hophuloc.online` | Canonical app URL |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | `https://staging.hophuloc.online` | `https://hophuloc.online,https://www.hophuloc.online` | Strict CORS whitelist |
| `DATABASE_URL` | `postgresql://...localhost:5432/...` | `postgresql://...staging-db:5432/...` | `postgresql://...postgres:5432/...` | PostgreSQL connection string |
| `JWT_SECRET` | 32+ char random key | 64+ char random key | 64+ char random key | Access token secret |
| `JWT_REFRESH_SECRET`| 32+ char random key | 64+ char random key | 64+ char random key | Refresh token secret |
| `GEMINI_API_KEY` | Development key | Staging key | Production Gemini key | AI Financial Assistant |

---

## 🐳 3. Quick Start Deployment with Docker Compose

### 3.1. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
# Chỉnh sửa các giá trị mật khẩu, JWT_SECRET, GEMINI_API_KEY
```

### 3.2. Khởi chạy toàn bộ hệ thống Production:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3.3. Kiểm tra trạng thái các container:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 🩺 4. Health, Liveness & Readiness Probes

Hệ thống cung cấp 3 endpoint kiểm tra sức khỏe được tối ưu hóa cho Kubernetes / Docker / Cloud Run:

| Endpoint | Mục đích | Tiêu chí đánh giá | Bảo mật |
| :--- | :--- | :--- | :--- |
| **`GET /health`** | Basic Health | Phản hồi `200 OK` nếu Express đang chạy. | Không để lộ thông tin cấu hình nội bộ |
| **`GET /health/live`** | Liveness Probe | Phản hồi `200 OK` để container manager biết tiến trình không bị deadlock. | Nhẹ, không phụ thuộc database |
| **`GET /health/ready`** | Readiness Probe | Phản hồi `200 OK` khi CSDL PostgreSQL sẵn sàng nhận truy vấn (`SELECT 1`). Phản hồi `503 Service Unavailable` khi đang dừng hoặc CSDL mất kết nối. | Che giấu toàn bộ IP, Port, DB Name, Stack Trace |

---

## 🔄 5. Zero-Downtime Database Migration Strategy

Để đảm bảo không bị gián đoạn dịch vụ khi nâng cấp CSDL, áp dụng quy tắc **Expand and Contract (Mở rộng trước, Thu hẹp sau)**:

1. **Thêm cột mới (Phase 1 - Expand)**:
   * Thêm cột mới dưới dạng `NULLABLE` hoặc có `DEFAULT`.
   * Chạy `npx prisma migrate deploy` trong quá trình CI/CD.
2. **Triển khai Code mới (Phase 2 - Deploy)**:
   * Code mới ghi vào cả cột cũ và cột mới hoặc chỉ đọc cột mới với fallback.
3. **Chuyển đổi Dữ liệu (Phase 3 - Backfill)**:
   * Chạy script cập nhật dữ liệu lịch sử nếu cần thiết.
4. **Xóa cột cũ (Phase 4 - Contract)**:
   * Sau khi phiên bản mới chạy ổn định, tạo migration tiếp theo để drop cột cũ không còn sử dụng.

### Chạy Migration thủ công:
```bash
chmod +x ./scripts/migrate.sh
./scripts/migrate.sh
```

---

## 💾 6. Database Backup, Verification & Restore

### 6.1. Sao lưu tự động (Automated Backup):
* Container `postgres-backup` tự động tạo file sao lưu nén `.sql.gz` hàng ngày lúc 00:00 và lưu trữ tại thư mục `./backups`.
* Tự động duy trì 7 bản sao lưu ngày, 4 bản sao lưu tuần và 6 bản sao lưu tháng.

### 6.2. Tạo bản sao lưu thủ công (Manual Backup):
```bash
chmod +x ./scripts/backup.sh
./scripts/backup.sh
```

### 6.3. Kiểm tra tính toàn vẹn bản sao lưu (Verification):
```bash
chmod +x ./scripts/verify-backup.sh
./scripts/verify-backup.sh ./backups/hophuloc_expense_db_backup_20260817_120000.sql.gz
```

### 6.4. Quy trình phục hồi CSDL (Database Restore):
```bash
chmod +x ./scripts/restore.sh
# Chế độ tương tác an toàn (hỏi xác nhận):
./scripts/restore.sh ./backups/hophuloc_expense_db_backup_20260817_120000.sql.gz

# Chế độ tự động trong script CI/CD:
./scripts/restore.sh ./backups/hophuloc_expense_db_backup_20260817_120000.sql.gz --force
```

---

## ⏪ 7. Rollback Strategy

Khi phát hiện phiên bản mới gặp lỗi nghiêm trọng sau khi triển khai:

1. **Rollback Container Application**:
   ```bash
   # Khôi phục container về image trước đó
   docker compose -f docker-compose.prod.yml down app
   docker tag hophuloc/expense-ledger:previous hophuloc/expense-ledger:latest
   docker compose -f docker-compose.prod.yml up -d app
   ```
2. **Kiểm tra Readiness Probe**:
   ```bash
   curl -f http://127.0.0.1:3000/health/ready
   ```
3. **Rollback Cơ sở dữ liệu (Nếu có schema incompatibility)**:
   * Sử dụng bản sao lưu được tạo ngay trước thời điểm deploy để khôi phục qua `./scripts/restore.sh`.
