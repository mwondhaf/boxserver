import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MomoClient,
  CollectPayload,
  CollectResult,
  StatusResult,
} from './momo-client';

@Injectable()
export class RelworxMomoClient implements MomoClient {
  private readonly log = new Logger(RelworxMomoClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('app.relworxApiUrl') ?? 'https://api.relworx.com';
    this.apiKey = config.get<string>('app.relworxApiKey') ?? '';
  }

  async collect(payload: CollectPayload): Promise<CollectResult> {
    const res = await fetch(`${this.baseUrl}/v1/payments/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        phone_number: payload.phoneNumber,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        description: payload.description,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.log.error(`Relworx collect failed: ${res.status} ${text}`);
      return { providerReference: payload.reference, status: 'failed' };
    }

    const data = (await res.json()) as { reference: string; status: string };
    return {
      providerReference: data.reference,
      status: data.status === 'PENDING' ? 'pending' : 'success',
    };
  }

  async getStatus(providerReference: string): Promise<StatusResult> {
    const res = await fetch(`${this.baseUrl}/v1/payments/${providerReference}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      return { providerReference, status: 'failed' };
    }

    const data = (await res.json()) as {
      reference: string;
      status: string;
      amount?: number;
      charge?: number;
    };

    const statusMap: Record<string, StatusResult['status']> = {
      PENDING: 'pending',
      SUCCESS: 'success',
      FAILED: 'failed',
      EXPIRED: 'expired',
    };

    return {
      providerReference: data.reference,
      status: statusMap[data.status] ?? 'failed',
      amount: data.amount,
      charge: data.charge,
    };
  }
}
