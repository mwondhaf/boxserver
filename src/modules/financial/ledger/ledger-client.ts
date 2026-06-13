export interface SplitPayload {
  correlationId: string;
  orderId: string;
  vendorWalletId: string;
  riderWalletId?: string;
  platformWalletId: string;
  vendorAmount: number;
  riderAmount: number;
  platformAmount: number;
  currency: string;
}

export interface SplitResult {
  boxWalletOrderId: string;
  status: 'processed' | 'quarantined' | 'already_synced';
}

export interface WalletCreatePayload {
  entityType: 'vendor' | 'rider' | 'customer' | 'platform';
  entityId: string;
  entityName: string;
  currency: string;
}

export interface WalletResult {
  walletId: string;
}

export interface LedgerClient {
  confirmSplit(payload: SplitPayload): Promise<SplitResult>;
  reverseSplit(correlationId: string, reason: string): Promise<void>;
  createWallet(payload: WalletCreatePayload): Promise<WalletResult>;
}

export const LEDGER_CLIENT = 'LEDGER_CLIENT';
