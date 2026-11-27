-- Lịch định kỳ thật (tuần/tháng/năm). Bản ghi cũ có nextDueDate NULL: ứng dụng khởi tạo
-- bằng kỳ đầu tiên tính từ ngày đồng bộ, không sinh giao dịch quá khứ.
ALTER TABLE "RecurringTransaction" ADD COLUMN "frequency" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN "anchorDate" DATE,
ADD COLUMN "nextDueDate" DATE,
ADD COLUMN "lastDueDate" DATE;

ALTER TABLE "Transaction" ADD COLUMN "recurringId" TEXT,
ADD COLUMN "recurringDueDate" DATE;

-- Mỗi kỳ của một khoản định kỳ chỉ có tối đa một giao dịch (NULL không bị ràng buộc)
CREATE UNIQUE INDEX "Transaction_recurringId_recurringDueDate_key" ON "Transaction"("recurringId", "recurringDueDate");

-- Xóa khoản định kỳ giữ nguyên giao dịch đã ghi
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
