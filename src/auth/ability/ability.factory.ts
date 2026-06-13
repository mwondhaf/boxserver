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

export interface Ability {
  can: (action: Action, subject: Subject) => boolean;
  cannot: (action: Action, subject: Subject) => boolean;
}

type Rule = { action: Action | Action[]; subject: Subject | Subject[] };

function buildAbility(rules: Rule[]): Ability {
  const can = (action: Action, subject: Subject): boolean =>
    rules.some(
      (r) =>
        (r.action === action ||
          r.action === 'manage' ||
          (Array.isArray(r.action) &&
            (r.action.includes(action) || r.action.includes('manage' as Action)))) &&
        (r.subject === subject ||
          r.subject === 'all' ||
          (Array.isArray(r.subject) &&
            (r.subject.includes(subject) || r.subject.includes('all' as Subject)))),
    );

  return { can, cannot: (a, s) => !can(a, s) };
}

export function createAbility(actor: ActorContext): Ability {
  if (actor.platformRole === 'admin') {
    return buildAbility([{ action: 'manage', subject: 'all' }]);
  }

  if (actor.platformRole === 'rider') {
    return buildAbility([
      { action: 'read', subject: 'Order' },
      { action: 'read', subject: 'Parcel' },
      { action: ['read', 'update'], subject: 'Rider' },
    ]);
  }

  // Vendor org roles
  const rules: Rule[] = [];

  if (actor.orgRole === 'owner') {
    rules.push(
      { action: 'manage', subject: 'Organization' },
      { action: 'manage', subject: 'Product' },
      { action: 'manage', subject: 'ProductVariant' },
      { action: 'manage', subject: 'Order' },
      { action: 'manage', subject: 'Subscription' },
      { action: 'manage', subject: 'Promotion' },
      { action: 'read', subject: 'Financial' },
    );
  } else if (actor.orgRole === 'admin') {
    rules.push(
      { action: ['read', 'update'], subject: 'Organization' },
      { action: 'manage', subject: 'Product' },
      { action: 'manage', subject: 'ProductVariant' },
      { action: 'manage', subject: 'Order' },
      { action: ['read', 'create', 'update'], subject: 'Subscription' },
      { action: ['read', 'create', 'update'], subject: 'Promotion' },
    );
  } else if (actor.orgRole === 'member') {
    rules.push(
      { action: 'read', subject: 'Organization' },
      { action: ['read', 'update'], subject: 'Order' },
      { action: 'read', subject: 'Product' },
    );
  }

  // Customer (default platform role)
  rules.push(
    { action: 'read', subject: 'Product' },
    { action: 'read', subject: 'Order' },
    { action: 'manage', subject: 'Parcel' },
    { action: ['read', 'create', 'update', 'delete'], subject: 'User' },
  );

  return buildAbility(rules);
}
