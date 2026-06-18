import { ConflictException } from '@nestjs/common';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function assertValidTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  const allowed = TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new ConflictException(
      `Cannot transition order from '${from}' to '${to}'`,
    );
  }
}

export function canCancel(status: OrderStatus): boolean {
  return TRANSITIONS[status]?.includes('cancelled') ?? false;
}
