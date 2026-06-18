import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LedgerClient,
  SplitPayload,
  SplitResult,
  WalletCreatePayload,
  WalletResult,
} from './ledger-client';

@Injectable()
export class BoxWalletLedgerClient implements LedgerClient {
  private readonly log = new Logger(BoxWalletLedgerClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      config.get<string>('app.boxwalletApiUrl') ?? 'https://api.boxwallet.ug';
    this.apiKey = config.get<string>('app.boxwalletApiKey') ?? '';
  }

  async confirmSplit(payload: SplitPayload): Promise<SplitResult> {
    const res = await fetch(`${this.baseUrl}/orders/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'Idempotency-Key': payload.correlationId,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      return {
        boxWalletOrderId: payload.correlationId,
        status: 'already_synced',
      };
    }

    if (!res.ok) {
      const text = await res.text();
      this.log.error(`BoxWallet confirmSplit failed: ${res.status} ${text}`);
      return { boxWalletOrderId: payload.correlationId, status: 'quarantined' };
    }

    const data = (await res.json()) as { id: string };
    return { boxWalletOrderId: data.id, status: 'processed' };
  }

  async reverseSplit(correlationId: string, reason: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/orders/${correlationId}/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`BoxWallet reverseSplit failed: ${res.status} ${text}`);
    }
  }

  async createWallet(payload: WalletCreatePayload): Promise<WalletResult> {
    const res = await fetch(`${this.baseUrl}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`BoxWallet createWallet failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { walletId: string };
    return { walletId: data.walletId };
  }
}
