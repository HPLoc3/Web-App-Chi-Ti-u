import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Wallet, 
  CreditCard, 
  Landmark, 
  Smartphone, 
  Plus, 
  ArrowRightLeft, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  ShieldCheck,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { useToast } from '../../../context/ToastContext';
import { EmptyState } from '../../../components/common/EmptyState';
import { StatCard } from '../../../components/common/StatCard';
import { walletService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { getApiErrorMessage } from '../../../lib/apiClient';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import MoneyInput from '../../../components/common/MoneyInput';
import { FitText } from '../../../components/common/FitText';
import { EMPTY_MONEY, moneyDraft, moneyDraftError } from '../../../utils/moneyDraft';

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit' | 'ewallet';
  accountNumber?: string;
  institution?: string;
  balance: number;
  isDefault?: boolean;
  color?: string;
  /** Số giao dịch của ví (chỉ có ở chế độ đăng nhập) */
  transactionCount?: number;
}

const TRANSFER_MIN_VND = 1000;

const fetchAccounts = async (): Promise<FinancialAccount[]> =>
  (await walletService.getWallets()).map((w) => ({
    id: w.id,
    name: w.name,
    balance: w.balance,
    isDefault: w.isDefault,
    type: (w.type as FinancialAccount['type']) || 'cash',
    accountNumber: w.accountNumber,
    institution: w.bankName,
    transactionCount: w.transactionCount,
  }));

interface WalletsTabProps {
  income?: number;
  totalExpenses?: number;
}

const DEFAULT_INITIAL_WALLETS: FinancialAccount[] = [
  {
    id: 'wallet-cash',
    name: 'Ví Tiền Mặt',
    type: 'cash',
    balance: 2450000,
    isDefault: true,
    color: '#059669', // emerald
  },
  {
    id: 'wallet-vcb',
    name: 'Vietcombank Digibank',
    type: 'bank',
    accountNumber: '**** 8868',
    institution: 'Vietcombank',
    balance: 18500000,
    isDefault: false,
    color: '#0284c7', // sky
  },
  {
    id: 'wallet-tcb',
    name: 'Techcombank Tiết Kiệm',
    type: 'bank',
    accountNumber: '**** 9292',
    institution: 'Techcombank',
    balance: 35000000,
    isDefault: false,
    color: '#dc2626', // red
  },
  {
    id: 'wallet-momo',
    name: 'Ví Điện Tử MoMo',
    type: 'ewallet',
    accountNumber: '090***9988',
    balance: 850000,
    isDefault: false,
    color: '#c026d3', // fuchsia
  },
  {
    id: 'wallet-credit',
    name: 'Thẻ Tín Dụng Cashback',
    type: 'credit',
    accountNumber: '**** 4112',
    institution: 'VPBank Visa',
    balance: -3200000, // outstanding balance
    isDefault: false,
    color: '#7c3aed', // violet
  },
];

export const WalletsTab: React.FC<WalletsTabProps> = () => {
  const { isAuthenticated, user } = useAuth();
  // Đổi key khi đổi phiên để state của khách và của tài khoản không lẫn vào nhau
  return (
    <WalletsView
      key={isAuthenticated ? `user-${user?.id}` : 'guest'}
      isServerMode={!!isAuthenticated}
    />
  );
};

const WalletsView: React.FC<{ isServerMode: boolean }> = ({ isServerMode }) => {
  const { showToast } = useToast();

  // Đã đăng nhập: server là nguồn sự thật. Khách: lưu cục bộ trên trình duyệt.
  const [wallets, setWallets] = useState<FinancialAccount[]>(() => {
    if (isServerMode) return [];
    try {
      const saved = localStorage.getItem('so_tay_wallets_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_INITIAL_WALLETS;
  });
  const [isLoadingWallets, setIsLoadingWallets] = useState(isServerMode);
  const [hasLoaded, setHasLoaded] = useState(!isServerMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Chỉ dùng ở chế độ khách
  const saveWallets = (next: FinancialAccount[]) => {
    setWallets(next);
    localStorage.setItem('so_tay_wallets_data', JSON.stringify(next));
  };

  const loadBackendWallets = useCallback(async () => {
    try {
      setIsLoadingWallets(true);
      setLoadError(null);
      setWallets(await fetchAccounts());
      setHasLoaded(true);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được danh sách ví.'));
    } finally {
      setIsLoadingWallets(false);
    }
  }, []);

  useEffect(() => {
    if (isServerMode) loadBackendWallets();
  }, [isServerMode, loadBackendWallets]);

  // Chống bấm đúp: mỗi lúc chỉ một thao tác ghi lên server
  const busyRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);

  /** Chỉ trả true khi server nhận thao tác; lỗi thì toast và giữ nguyên state. */
  const runServerAction = async (
    action: () => Promise<unknown>,
    fallbackError: string,
    /** Trả true nếu đã tự xử lý lỗi */
    handleError?: (err: any) => Promise<boolean>
  ) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setIsBusy(true);
    try {
      await action();
      await loadBackendWallets();
      return true;
    } catch (err) {
      if (await handleError?.(err)) return false;
      showToast(getApiErrorMessage(err, fallbackError), 'error');
      return false;
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  };

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<FinancialAccount | null>(null);
  const [deletingWallet, setDeletingWallet] = useState<FinancialAccount | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<FinancialAccount['type']>('bank');
  const [formBalance, setFormBalance] = useState(EMPTY_MONEY);
  const [formInstitution, setFormInstitution] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');

  // Transfer Form states
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState(EMPTY_MONEY);
  const [transferNote, setTransferNote] = useState('');

  // Balance calculations
  const totalPositiveBalance = useMemo(() => {
    return wallets.reduce((sum, w) => (w.balance > 0 ? sum + w.balance : sum), 0);
  }, [wallets]);

  // Chỉ thẻ tín dụng mới tính là nợ thẻ
  const totalDebt = useMemo(() => {
    return wallets.reduce(
      (sum, w) => (w.type === 'credit' && w.balance < 0 ? sum + Math.abs(w.balance) : sum),
      0
    );
  }, [wallets]);

  // Khả dụng: mọi ví không phải thẻ tín dụng, kể cả số dư âm
  const availableBalance = useMemo(() => {
    return wallets.reduce((sum, w) => (w.type !== 'credit' ? sum + w.balance : sum), 0);
  }, [wallets]);

  const netWorth = wallets.reduce((sum, w) => sum + w.balance, 0);

  // Ô số dư khi sửa: thẻ tín dụng hiện trị tuyệt đối (dư nợ), ví khác hiện đúng dấu
  const toBalanceValue = (type: FinancialAccount['type'], balance: number) =>
    type === 'credit' ? Math.abs(balance) : balance;

  // Người dùng chưa đụng vào ô số dư thì phải giữ nguyên số dư gốc
  const isBalanceUntouched =
    !!editingWallet && formBalance.value === toBalanceValue(formType, editingWallet.balance);

  const handleSelectType = (type: FinancialAccount['type']) => {
    if (editingWallet && isBalanceUntouched) {
      setFormBalance(moneyDraft(toBalanceValue(type, editingWallet.balance)));
    }
    setFormType(type);
  };

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setFormName('');
    setFormType('bank');
    setFormBalance(EMPTY_MONEY);
    setFormInstitution('');
    setFormAccountNumber('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (w: FinancialAccount) => {
    setEditingWallet(w);
    setFormName(w.name);
    setFormType(w.type);
    setFormBalance(moneyDraft(toBalanceValue(w.type, w.balance)));
    setFormInstitution(w.institution || '');
    setFormAccountNumber(w.accountNumber || '');
    setIsAddModalOpen(true);
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên ví / tài khoản', 'warning');
      return;
    }
    // Số dư giữ nguyên thì không cần kiểm (và không gửi lên server)
    const balanceError = isBalanceUntouched ? null : moneyDraftError(formBalance, 'signed', 'số dư');
    if (balanceError) {
      showToast(balanceError, 'warning');
      return;
    }
    const balanceNum = formBalance.value ?? 0;

    const enteredBalance = formType === 'credit' && balanceNum > 0 ? -balanceNum : balanceNum;
    const calculatedBalance =
      editingWallet && isBalanceUntouched ? editingWallet.balance : enteredBalance;

    if (isServerMode) {
      const target = editingWallet;
      const ok = await runServerAction(
        () =>
          target
            ? walletService.updateWallet(target.id, {
                name: formName.trim(),
                type: formType,
                ...(isBalanceUntouched ? {} : { balance: calculatedBalance }),
              })
            : walletService.createWallet({
                name: formName.trim(),
                balance: calculatedBalance,
                isDefault: wallets.length === 0,
                type: formType,
              }),
        'Không lưu được thông tin ví.'
      );
      if (!ok) return;
      showToast(target ? 'Đã cập nhật thông tin tài khoản!' : 'Đã thêm tài khoản tài chính mới!', 'success');
      setIsAddModalOpen(false);
      return;
    }

    const details = {
      name: formName.trim(),
      type: formType,
      balance: calculatedBalance,
      institution: formInstitution.trim() || undefined,
      accountNumber: formAccountNumber.trim() || undefined,
    };
    if (editingWallet) {
      saveWallets(wallets.map((w) => (w.id === editingWallet.id ? { ...w, ...details } : w)));
      showToast('Đã cập nhật thông tin tài khoản!', 'success');
    } else {
      saveWallets([...wallets, { id: `wallet-${Date.now()}`, ...details, isDefault: wallets.length === 0 }]);
      showToast('Đã thêm tài khoản tài chính mới!', 'success');
    }
    setIsAddModalOpen(false);
  };

  const handleSetDefault = async (id: string) => {
    if (isServerMode) {
      const ok = await runServerAction(() => walletService.setDefaultWallet(id), 'Không đặt được ví mặc định.');
      if (!ok) return;
    } else {
      saveWallets(wallets.map((w) => ({ ...w, isDefault: w.id === id })));
    }
    showToast('Đã đặt làm ví thanh toán mặc định.', 'success');
  };

  const handleRequestDelete = async (wallet: FinancialAccount) => {
    if (wallets.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 ví tài chính.', 'warning');
      return;
    }
    if (!isServerMode) {
      setDeletingWallet(wallet);
      return;
    }
    // Dữ liệu đang có thể đã cũ (ví hoặc giao dịch vừa đổi ở nơi khác): tải lại rồi mới hỏi
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    try {
      const fresh = await fetchAccounts();
      setWallets(fresh);
      const current = fresh.find((w) => w.id === wallet.id);
      if (!current) {
        showToast('Ví này không còn tồn tại.', 'info');
        return;
      }
      if (fresh.length <= 1) {
        showToast('Cần giữ lại ít nhất 1 ví tài chính.', 'warning');
        return;
      }
      // Biết chắc server sẽ từ chối thì báo ngay, không hỏi xác nhận
      if (current.transactionCount) {
        showToast(
          `Không thể xóa ví "${current.name}" vì ví còn ${current.transactionCount} giao dịch.`,
          'warning'
        );
        return;
      }
      setDeletingWallet(current);
    } catch {
      // Không kiểm lại được thì để server quyết định
      setDeletingWallet(wallet);
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    const target = deletingWallet;
    setDeletingWallet(null);
    if (!target) return;
    if (isServerMode) {
      const ok = await runServerAction(
        () => walletService.deleteWallet(target.id),
        'Không xóa được ví.',
        async (err) => {
          if (err?.response?.status !== 404) return false;
          showToast('Ví này không còn tồn tại.', 'info');
          await loadBackendWallets();
          return true;
        }
      );
      if (!ok) return;
    } else {
      const updated = wallets.filter((w) => w.id !== target.id);
      if (target.isDefault && updated.length > 0) {
        updated[0] = { ...updated[0], isDefault: true };
      }
      saveWallets(updated);
    }
    showToast('Đã xóa tài khoản ví.', 'info');
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
      showToast('Vui lòng chọn 2 tài khoản khác nhau để chuyển tiền.', 'warning');
      return;
    }
    const amountError =
      moneyDraftError(transferAmount, 'positive', 'số tiền chuyển') ??
      (transferAmount.value! < TRANSFER_MIN_VND
        ? `Số tiền chuyển tối thiểu là ${formatCurrency(TRANSFER_MIN_VND)}.`
        : null);
    if (amountError) {
      showToast(amountError, 'warning');
      return;
    }
    const amountNum = transferAmount.value!;

    if (isServerMode) {
      const ok = await runServerAction(
        () =>
          walletService.transfer({
            fromWalletId,
            toWalletId,
            amount: amountNum,
            note: transferNote.trim() || undefined,
          }),
        'Lỗi khi thực hiện giao dịch chuyển tiền.'
      );
      if (!ok) return;
    } else {
      saveWallets(
        wallets.map((w) => {
          if (w.id === fromWalletId) return { ...w, balance: w.balance - amountNum };
          if (w.id === toWalletId) return { ...w, balance: w.balance + amountNum };
          return w;
        })
      );
    }

    showToast(`Đã chuyển ${formatCurrency(amountNum)} giữa 2 tài khoản an toàn!`, 'success');
    setTransferAmount(EMPTY_MONEY);
    setTransferNote('');
    setIsTransferModalOpen(false);
  };

  const getAccountIcon = (type: FinancialAccount['type']) => {
    switch (type) {
      case 'cash':
        return <Wallet className="text-emerald-600" size={20} />;
      case 'bank':
        return <Landmark className="text-sky-600" size={20} />;
      case 'credit':
        return <CreditCard className="text-purple-600" size={20} />;
      case 'ewallet':
        return <Smartphone className="text-fuchsia-600" size={20} />;
    }
  };

  const getAccountTypeLabel = (type: FinancialAccount['type']) => {
    switch (type) {
      case 'cash': return 'Tiền mặt';
      case 'bank': return 'Tài khoản Ngân hàng';
      case 'credit': return 'Thẻ Tín Dụng';
      case 'ewallet': return 'Ví Điện Tử';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Summary KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6DEC9]">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-emerald-950">
            Ví Tiền & Nguồn Tài Khoản
          </h2>
          <p className="text-xs text-stone-500 font-sans">
            Quản lý tổng tài sản thực tế và phân bổ dòng tiền giữa các nguồn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (wallets.length >= 2) {
                setFromWalletId(wallets[0].id);
                setToWalletId(wallets[1].id);
                setIsTransferModalOpen(true);
              } else {
                showToast('Cần ít nhất 2 ví để thực hiện chuyển tiền.', 'info');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E6DEC9] bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ArrowRightLeft size={14} className="text-emerald-800" />
            <span>Chuyển tiền</span>
          </button>

          <button
            onClick={handleOpenAdd}
            disabled={!hasLoaded}
            className="disabled:opacity-50 flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Thêm ví mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Net Worth, Liquid Cash, Debt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tổng Giá Trị Ròng (Net Worth)"
          value={hasLoaded ? formatCurrency(netWorth) : '—'}
          subtitle={`${wallets.length} nguồn tiền đang liên kết`}
          icon={<ShieldCheck size={18} />}
          variant="emerald"
        />
        <StatCard
          title="Tổng Số Dư Khả Dụng"
          value={hasLoaded ? formatCurrency(availableBalance) : '—'}
          subtitle="Tiền mặt + Ngân hàng + Ví (đã trừ số dư âm)"
          icon={<Wallet size={18} />}
          variant="blue"
        />
        <StatCard
          title="Dư Nợ Thẻ Tín Dụng"
          value={hasLoaded ? formatCurrency(totalDebt) : '—'}
          subtitle={totalDebt > 0 ? 'Cần tất toán kỳ hạn tới' : 'Không có dư nợ thẻ'}
          icon={<CreditCard size={18} />}
          variant={totalDebt > 0 ? 'amber' : 'default'}
        />
      </div>

      {/* Wallets Grid List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-base font-bold text-emerald-950">
            Danh Sách Tài Khoản & Ví
          </h3>
          <span className="text-xs text-stone-500 font-sans">
            Bấm "Đặt mặc định" để chọn nguồn chi ưu tiên
          </span>
        </div>

        {loadError && (
          <div role="alert" className="mb-3 flex items-center justify-between gap-3 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => loadBackendWallets()}
              disabled={isLoadingWallets}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 bg-white font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} />
              <span>Thử lại</span>
            </button>
          </div>
        )}

        {!hasLoaded ? (
          isLoadingWallets && (
            <p role="status" className="py-8 text-center text-xs text-stone-500">
              Đang tải danh sách ví...
            </p>
          )
        ) : wallets.length === 0 ? (
          <EmptyState
            title="Chưa có ví nào được tạo"
            description="Tạo ví tiền mặt hoặc tài khoản ngân hàng đầu tiên để quản lý dòng tiền."
            actionText="Thêm ví mới"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {wallets.map((wallet) => {
              const allocationPct = totalPositiveBalance > 0 && wallet.balance > 0
                ? ((wallet.balance / totalPositiveBalance) * 100).toFixed(0)
                : 0;

              return (
                <div
                  key={wallet.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                    wallet.isDefault ? 'border-amber-400 ring-1 ring-amber-300' : 'border-[#E6DEC9]'
                  }`}
                >
                  {/* Default Tag */}
                  {wallet.isDefault && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-emerald-950 text-[10px] font-bold px-3 py-0.5 rounded-bl-xl font-mono uppercase tracking-wider">
                      Mặc Định
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200">
                        {getAccountIcon(wallet.type)}
                      </div>
                      <div className="min-w-0 pr-12">
                        <h4 className="font-serif font-bold text-sm text-emerald-950 [overflow-wrap:anywhere]">
                          {wallet.name}
                        </h4>
                        <p className="text-[11px] text-stone-500 break-words font-sans">
                          {getAccountTypeLabel(wallet.type)}
                          {wallet.accountNumber ? ` • ${wallet.accountNumber}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="my-4">
                      <span className="text-xs text-stone-500 font-sans block mb-1">
                        {wallet.type === 'credit'
                          ? 'Dư nợ tín dụng'
                          : wallet.balance < 0
                          ? 'Số dư âm'
                          : 'Số dư hiện tại'}
                      </span>
                      <FitText
                        text={formatCurrency(wallet.balance)}
                        className={`[--fit-max:1.5rem] font-mono font-black ${
                          wallet.balance < 0 ? 'text-red-600' : 'text-emerald-900'
                        }`}
                      />

                      {wallet.balance > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] text-stone-500 font-sans mb-1">
                            <span>Tỷ trọng dòng tiền</span>
                            <span className="font-mono font-bold text-emerald-950">{allocationPct}%</span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-700 h-1.5 rounded-full"
                              style={{ width: `${allocationPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-2">
                    {!wallet.isDefault ? (
                      <button
                        onClick={() => handleSetDefault(wallet.id)}
                        disabled={isBusy}
                        className="text-[11px] font-semibold text-stone-500 hover:text-emerald-800 transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        <span>Đặt mặc định</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                        <Check size={13} />
                        <span>Đang là mặc định</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(wallet)}
                        className="p-1.5 text-stone-400 hover:text-emerald-800 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                        title="Sửa thông tin ví"
                      >
                        <Edit3 size={14} />
                      </button>
                      {wallets.length > 1 && (
                        <button
                          onClick={() => void handleRequestDelete(wallet)}
                          disabled={isBusy}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Xóa ví"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E6DEC9]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-serif text-lg font-bold text-emerald-950">
                {editingWallet ? 'Sửa thông tin tài khoản' : 'Thêm ví / Tài khoản mới'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Loại tài khoản *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'bank', label: 'Ngân hàng', icon: Landmark },
                    { id: 'cash', label: 'Tiền mặt', icon: Wallet },
                    { id: 'ewallet', label: 'Ví điện tử', icon: Smartphone },
                    { id: 'credit', label: 'Tín dụng', icon: CreditCard },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => handleSelectType(t.id as FinancialAccount['type'])}
                      className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                        formType === t.id
                          ? 'bg-emerald-950 text-amber-300 border-emerald-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <t.icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tên tài khoản / Tên ví *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Vietcombank, Ví Tiền Mặt, MoMo"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {formType === 'credit'
                    ? editingWallet ? 'Dư nợ hiện tại (VNĐ)' : 'Dư nợ ban đầu (VNĐ)'
                    : editingWallet ? 'Số dư hiện tại (VNĐ) *' : 'Số dư ban đầu (VNĐ) *'}
                </label>
                <MoneyInput
                  allowNegative
                  value={formBalance.value}
                  onChange={(value, raw) => setFormBalance({ value, raw })}
                  placeholder="0"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-stone-900 text-base font-bold focus:outline-none focus:border-emerald-700"
                />
                {formType === 'credit' && editingWallet && editingWallet.balance > 0 && (
                  <p className="text-[11px] text-stone-500 mt-1">
                    Thẻ đang có số dư dương {formatCurrency(editingWallet.balance)} (trả dư). Giữ nguyên ô này thì số dư không đổi; nhập số mới sẽ được tính là dư nợ.
                  </p>
                )}
              </div>

              {/* Server chưa lưu hai trường này nên chỉ hiện ở chế độ khách */}
              {!isServerMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tên tổ chức (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={formInstitution}
                      onChange={(e) => setFormInstitution(e.target.value)}
                      placeholder="VD: VCB, TCB, MB"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Số tài khoản (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      placeholder="VD: **** 8888"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="disabled:opacity-50 px-5 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingWallet ? 'Lưu thay đổi' : 'Tạo ví mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Between Wallets Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E6DEC9]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-amber-600" />
                <span>Chuyển tiền giữa các ví</span>
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Từ tài khoản nguồn
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-emerald-700"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Đến tài khoản đích
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-emerald-700"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.id === fromWalletId}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Số tiền chuyển (VNĐ) *
                </label>
                <MoneyInput
                  value={transferAmount.value}
                  onChange={(value, raw) => setTransferAmount({ value, raw })}
                  placeholder="500000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-stone-900 text-base font-bold focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ghi chú chuyển khoản (tùy chọn)
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="VD: Rút tiền ATM về ví tiền mặt"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="disabled:opacity-50 px-5 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Xác nhận chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingWallet}
        title="Xóa ví"
        message={
          deletingWallet
            ? `Bạn có chắc muốn xóa ví "${deletingWallet.name}"?${
                deletingWallet.balance !== 0 ? ` Số dư hiện tại: ${formatCurrency(deletingWallet.balance)}.` : ''
              } Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingWallet(null)}
      />
    </div>
  );
};
