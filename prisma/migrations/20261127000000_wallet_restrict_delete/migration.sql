-- Chặn xóa ví còn giao dịch (trước đây CASCADE sẽ xóa luôn giao dịch)
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_walletId_fkey";

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
