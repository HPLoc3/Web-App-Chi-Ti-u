import { apiClient } from '../../lib/apiClient';

export interface WalletDTO {
  id: string;
  name: string;
  balance: number;
  currency: string;
  isDefault: boolean;
  type?: string;
  accountNumber?: string;
  bankName?: string;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransferParams {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string;
}

export const walletService = {
  /**
   * Lấy danh sách ví tài chính của người dùng
   */
  async getWallets(): Promise<WalletDTO[]> {
    const response = await apiClient.get('/api/v1/wallets');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map((w: any) => ({
        id: w.id,
        name: w.name,
        balance: Number(w.balance) || 0,
        currency: w.currency || 'VND',
        isDefault: !!w.isDefault,
        type: w.type || 'cash',
        accountNumber: w.accountNumber,
        bankName: w.bankName,
        transactionCount: typeof w.transactionCount === 'number' ? w.transactionCount : undefined,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }));
    }
    // Không coi phản hồi lạ là "không có ví" (server là nguồn sự thật)
    throw new Error('Phản hồi danh sách ví không hợp lệ.');
  },

  /**
   * Tạo ví tài chính mới
   */
  async createWallet(data: {
    name: string;
    balance: number;
    currency?: string;
    isDefault?: boolean;
    type?: string;
  }): Promise<WalletDTO> {
    const response = await apiClient.post('/api/v1/wallets', data);
    return response.data.data;
  },

  /**
   * Cập nhật thông tin ví
   */
  async updateWallet(id: string, data: {
    name?: string;
    balance?: number;
    currency?: string;
    isDefault?: boolean;
    type?: string;
  }): Promise<WalletDTO> {
    const response = await apiClient.put(`/api/v1/wallets/${id}`, data);
    return response.data.data;
  },

  /**
   * Đặt ví làm mặc định
   */
  async setDefaultWallet(id: string): Promise<WalletDTO> {
    const response = await apiClient.put(`/api/v1/wallets/${id}`, { isDefault: true });
    return response.data.data;
  },

  /**
   * Xóa ví
   */
  async deleteWallet(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/wallets/${id}`);
  },

  /**
   * Chuyển tiền nguyên tử giữa 2 ví
   */
  async transfer(params: TransferParams): Promise<{ fromWallet: WalletDTO; toWallet: WalletDTO }> {
    const response = await apiClient.post('/api/v1/wallets/transfer', params);
    return response.data.data;
  },
};
