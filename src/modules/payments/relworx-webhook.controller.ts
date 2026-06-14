import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { PaymentsService } from './payments.service';
import { Public } from '../../auth/session.guard';

@ApiExcludeController()
@Public()
@Controller('webhooks/relworx')
export class RelworxWebhookController {
  private readonly log = new Logger(RelworxWebhookController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: Record<string, unknown>,
    @Headers('x-relworx-signature') signature: string,
  ) {
    const secret = this.config.get<string>('app.relworxWebhookSecret') ?? '';
    const payload = JSON.stringify(body);
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    if (signature !== expected) {
      this.log.warn('Relworx webhook signature mismatch');
      throw new BadRequestException('Invalid signature');
    }

    const providerRef = String(body['reference'] ?? '');
    const status = String(body['status'] ?? '');

    if (providerRef && status) {
      await this.payments.handleWebhook(providerRef, status);
    }

    return { received: true };
  }
}
