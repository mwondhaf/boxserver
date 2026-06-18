import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability';
import type { ActorContext } from '../session.guard';

export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage'
  | 'approve'
  | 'suspend'
  | 'assign';

export type Subject =
  | 'Organization'
  | 'Product'
  | 'ProductVariant'
  | 'Order'
  | 'User'
  | 'Rider'
  | 'Stage'
  | 'DeliveryZone'
  | 'PricingRule'
  | 'Promotion'
  | 'Campaign'
  | 'Subscription'
  | 'Parcel'
  | 'PlatformSettings'
  | 'Financial'
  | 'Report'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Builds the CASL ability for a request actor. Platform role is authoritative
 * for admin/rider; vendor capabilities are derived from the resolved
 * organization role on the actor's active organization.
 */
export function defineAbilityFor(actor: ActorContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (actor.platformRole === 'admin') {
    can('manage', 'all');
    return build();
  }

  if (actor.platformRole === 'rider') {
    can('read', 'Order');
    can('read', 'Parcel');
    can(['read', 'update'], 'Rider');
    return build();
  }

  // Vendor org roles (only present when an active organization is resolved).
  if (actor.orgRole === 'owner') {
    can('manage', 'Organization');
    can('manage', 'Product');
    can('manage', 'ProductVariant');
    can('manage', 'Order');
    can('manage', 'Subscription');
    can('manage', 'Promotion');
    can('read', 'Financial');
  } else if (actor.orgRole === 'admin') {
    can(['read', 'update'], 'Organization');
    can('manage', 'Product');
    can('manage', 'ProductVariant');
    can('manage', 'Order');
    can(['read', 'create', 'update'], 'Subscription');
    can(['read', 'create', 'update'], 'Promotion');
  } else if (actor.orgRole === 'member') {
    can('read', 'Organization');
    can(['read', 'update'], 'Order');
    can('read', 'Product');
  }

  // Customer base permissions (the default platform role).
  can('read', 'Product');
  can('read', 'Order');
  can('manage', 'Parcel');
  can(['read', 'create', 'update', 'delete'], 'User');

  return build();
}
