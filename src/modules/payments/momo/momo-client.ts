export interface CollectPayload {
  phoneNumber: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
}

export interface CollectResult {
  providerReference: string;
  status: 'pending' | 'success' | 'failed';
}

export interface StatusResult {
  providerReference: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  amount?: number;
  charge?: number;
}

export interface MomoClient {
  collect(payload: CollectPayload): Promise<CollectResult>;
  getStatus(providerReference: string): Promise<StatusResult>;
}

export const MOMO_CLIENT = 'MOMO_CLIENT';
