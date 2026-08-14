import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export function useWallets() {
  const { user } = useAuth();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const wallets: Wallet[] = useMemo(() => {
    if (user?.wallets && user.wallets.length > 0) {
      return user.wallets;
    }
    return [
      {
        id: 'default-wallet',
        name: 'Ví chính',
        balance: 0,
        currency: 'VND',
      },
    ];
  }, [user]);

  const activeWallet = useMemo(() => {
    return wallets.find((w) => w.id === selectedWalletId) || wallets[0];
  }, [wallets, selectedWalletId]);

  return {
    wallets,
    activeWallet,
    selectedWalletId,
    setSelectedWalletId,
  };
}
