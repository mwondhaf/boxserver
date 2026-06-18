import { relations } from 'drizzle-orm';
import {
  users,
  sessions,
  accounts,
  organizations,
  members,
  invitations,
  organizationCategories,
  organizationCustomers,
  customerAddresses,
} from './schema/identity';
import { categories, categoryPricingRules, brands } from './schema/categories';
import {
  products,
  productImages,
  productTags,
  productCategories,
  productVariants,
  priceSets,
  moneyAmounts,
  menuModifierGroups,
  menuModifierOptions,
  variantCollections,
  variantCollectionItems,
} from './schema/catalog';
import { carts, cartItems, cartItemModifiers } from './schema/cart';
import {
  orders,
  orderItems,
  orderItemModifiers,
  orderEvents,
  orderItemEvents,
} from './schema/orders';
import {
  riders,
  riderLocations,
  stages,
  riderStageMemberships,
  riderRatings,
  riderIncidents,
  riderPayouts,
} from './schema/riders';
import {
  deliveryZones,
  pricingRules,
  zoneCommissionMappings,
  deliveryQuotes,
} from './schema/zones';
import {
  boxWalletMappings,
  boxWalletOrderConfirmations,
  boxWalletParcelConfirmations,
  boxWalletAutoCreateLog,
} from './schema/financial';
import { mobileMoneyPayments } from './schema/payments';
import { parcels, parcelEvents, parcelPricingRules } from './schema/parcels';
import {
  campaigns,
  campaignBudgets,
  campaignBudgetUsages,
  promotions,
  applicationMethods,
  promotionRules,
  promotionRuleValues,
  promotionUsages,
} from './schema/promotions';
import { referralCodes, referrals } from './schema/referrals';
import {
  subscriptionPlans,
  subscriptionPlanItems,
  subscriptionPlanSlots,
  subscriptions,
  subscriptionCycles,
} from './schema/subscriptions';
import {
  categoryTimeBoosts,
  timeOfDayRecommendations,
} from './schema/recommendations';
import { notifications } from './schema/notifications';

// Identity relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  memberships: many(members),
  customerAddresses: many(customerAddresses),
  organizationCustomers: many(organizationCustomers),
  riderProfile: one(riders, {
    fields: [users.id],
    references: [riders.userId],
  }),
  riderLocation: one(riderLocations, {
    fields: [users.id],
    references: [riderLocations.userId],
  }),
  referralCode: one(referralCodes, {
    fields: [users.id],
    references: [referralCodes.userId],
  }),
  notifications: many(notifications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(
  organizations,
  ({ many, one }) => ({
    members: many(members),
    invitations: many(invitations),
    products: many(products),
    productVariants: many(productVariants),
    variantCollections: many(variantCollections),
    organizationCustomers: many(organizationCustomers),
    orders: many(orders),
    subscriptionPlans: many(subscriptionPlans),
    category: one(organizationCategories, {
      fields: [organizations.categoryId],
      references: [organizationCategories.id],
    }),
  }),
);

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [members.userId], references: [users.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const organizationCategoriesRelations = relations(
  organizationCategories,
  ({ one, many }) => ({
    parent: one(organizationCategories, {
      fields: [organizationCategories.parentId],
      references: [organizationCategories.id],
      relationName: 'orgCategoryParent',
    }),
    children: many(organizationCategories, {
      relationName: 'orgCategoryParent',
    }),
    organizations: many(organizations),
  }),
);

export const customerAddressesRelations = relations(
  customerAddresses,
  ({ one }) => ({
    user: one(users, {
      fields: [customerAddresses.userId],
      references: [users.id],
    }),
  }),
);

// Category relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryParent',
  }),
  children: many(categories, { relationName: 'categoryParent' }),
  pricingRules: many(categoryPricingRules),
  timeBoosts: many(categoryTimeBoosts),
  products: many(products),
  productCategories: many(productCategories),
}));

export const categoryPricingRulesRelations = relations(
  categoryPricingRules,
  ({ one }) => ({
    category: one(categories, {
      fields: [categoryPricingRules.categoryId],
      references: [categories.id],
    }),
  }),
);

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

// Catalog relations
export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  images: many(productImages),
  tags: many(productTags),
  productCategories: many(productCategories),
  variants: many(productVariants),
  modifierGroups: many(menuModifierGroups),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
  }),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one }) => ({
    product: one(products, {
      fields: [productCategories.productId],
      references: [products.id],
    }),
    category: one(categories, {
      fields: [productCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    organization: one(organizations, {
      fields: [productVariants.organizationId],
      references: [organizations.id],
    }),
    priceSet: one(priceSets, {
      fields: [productVariants.id],
      references: [priceSets.variantId],
    }),
    cartItems: many(cartItems),
    collectionItems: many(variantCollectionItems),
  }),
);

export const priceSetsRelations = relations(priceSets, ({ one, many }) => ({
  variant: one(productVariants, {
    fields: [priceSets.variantId],
    references: [productVariants.id],
  }),
  amounts: many(moneyAmounts),
}));

export const moneyAmountsRelations = relations(moneyAmounts, ({ one }) => ({
  priceSet: one(priceSets, {
    fields: [moneyAmounts.priceSetId],
    references: [priceSets.id],
  }),
}));

export const menuModifierGroupsRelations = relations(
  menuModifierGroups,
  ({ one, many }) => ({
    product: one(products, {
      fields: [menuModifierGroups.productId],
      references: [products.id],
    }),
    options: many(menuModifierOptions),
  }),
);

export const menuModifierOptionsRelations = relations(
  menuModifierOptions,
  ({ one }) => ({
    group: one(menuModifierGroups, {
      fields: [menuModifierOptions.modifierGroupId],
      references: [menuModifierGroups.id],
    }),
  }),
);

export const variantCollectionsRelations = relations(
  variantCollections,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [variantCollections.organizationId],
      references: [organizations.id],
    }),
    items: many(variantCollectionItems),
  }),
);

export const variantCollectionItemsRelations = relations(
  variantCollectionItems,
  ({ one }) => ({
    collection: one(variantCollections, {
      fields: [variantCollectionItems.collectionId],
      references: [variantCollections.id],
    }),
    variant: one(productVariants, {
      fields: [variantCollectionItems.variantId],
      references: [productVariants.id],
    }),
  }),
);

// Cart relations
export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [carts.organizationId],
    references: [organizations.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one, many }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
  modifiers: many(cartItemModifiers),
}));

export const cartItemModifiersRelations = relations(
  cartItemModifiers,
  ({ one }) => ({
    cartItem: one(cartItems, {
      fields: [cartItemModifiers.cartItemId],
      references: [cartItems.id],
    }),
    option: one(menuModifierOptions, {
      fields: [cartItemModifiers.modifierOptionId],
      references: [menuModifierOptions.id],
    }),
  }),
);

// Order relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orders.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  customerAddress: one(customerAddresses, {
    fields: [orders.customerAddressId],
    references: [customerAddresses.id],
  }),
  items: many(orderItems),
  events: many(orderEvents),
  itemEvents: many(orderItemEvents),
  promotionUsages: many(promotionUsages),
  boxWalletConfirmation: one(boxWalletOrderConfirmations, {
    fields: [orders.id],
    references: [boxWalletOrderConfirmations.orderId],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  modifiers: many(orderItemModifiers),
}));

export const orderItemModifiersRelations = relations(
  orderItemModifiers,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [orderItemModifiers.orderItemId],
      references: [orderItems.id],
    }),
  }),
);

export const orderItemEventsRelations = relations(
  orderItemEvents,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderItemEvents.orderId],
      references: [orders.id],
    }),
    orderItem: one(orderItems, {
      fields: [orderItemEvents.orderItemId],
      references: [orderItems.id],
    }),
  }),
);

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
}));

// Zones relations
export const deliveryZonesRelations = relations(
  deliveryZones,
  ({ many, one }) => ({
    pricingRules: many(pricingRules),
    stages: many(stages),
    commissionMapping: one(zoneCommissionMappings, {
      fields: [deliveryZones.id],
      references: [zoneCommissionMappings.zoneId],
    }),
  }),
);

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  zone: one(deliveryZones, {
    fields: [pricingRules.zoneId],
    references: [deliveryZones.id],
  }),
}));

// Rider relations
export const ridersRelations = relations(riders, ({ one, many }) => ({
  user: one(users, { fields: [riders.userId], references: [users.id] }),
  location: one(riderLocations, {
    fields: [riders.userId],
    references: [riderLocations.userId],
  }),
  stageMemberships: many(riderStageMemberships),
  ratings: many(riderRatings),
  incidents: many(riderIncidents),
  payouts: many(riderPayouts),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  zone: one(deliveryZones, {
    fields: [stages.zoneId],
    references: [deliveryZones.id],
  }),
  riderMemberships: many(riderStageMemberships),
}));

export const riderStageMembershipsRelations = relations(
  riderStageMemberships,
  ({ one }) => ({
    rider: one(riders, {
      fields: [riderStageMemberships.riderId],
      references: [riders.id],
    }),
    stage: one(stages, {
      fields: [riderStageMemberships.stageId],
      references: [stages.id],
    }),
  }),
);

// Parcel relations
export const parcelsRelations = relations(parcels, ({ one, many }) => ({
  quote: one(deliveryQuotes, {
    fields: [parcels.quoteId],
    references: [deliveryQuotes.id],
  }),
  events: many(parcelEvents),
  boxWalletConfirmation: one(boxWalletParcelConfirmations, {
    fields: [parcels.id],
    references: [boxWalletParcelConfirmations.parcelId],
  }),
}));

export const parcelEventsRelations = relations(parcelEvents, ({ one }) => ({
  parcel: one(parcels, {
    fields: [parcelEvents.parcelId],
    references: [parcels.id],
  }),
}));

// Financial relations
export const boxWalletOrderConfirmationsRelations = relations(
  boxWalletOrderConfirmations,
  ({ one }) => ({
    order: one(orders, {
      fields: [boxWalletOrderConfirmations.orderId],
      references: [orders.id],
    }),
  }),
);

// Campaign/promotion relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  budgets: many(campaignBudgets),
  promotions: many(promotions),
}));

export const campaignBudgetsRelations = relations(
  campaignBudgets,
  ({ one, many }) => ({
    campaign: one(campaigns, {
      fields: [campaignBudgets.campaignId],
      references: [campaigns.id],
    }),
    usages: many(campaignBudgetUsages),
  }),
);

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [promotions.campaignId],
    references: [campaigns.id],
  }),
  organization: one(organizations, {
    fields: [promotions.organizationId],
    references: [organizations.id],
  }),
  applicationMethod: one(applicationMethods, {
    fields: [promotions.id],
    references: [applicationMethods.promotionId],
  }),
  rules: many(promotionRules),
  usages: many(promotionUsages),
}));

export const promotionRulesRelations = relations(
  promotionRules,
  ({ one, many }) => ({
    promotion: one(promotions, {
      fields: [promotionRules.promotionId],
      references: [promotions.id],
    }),
    values: many(promotionRuleValues),
  }),
);

// Referral relations
export const referralCodesRelations = relations(
  referralCodes,
  ({ one, many }) => ({
    user: one(users, {
      fields: [referralCodes.userId],
      references: [users.id],
    }),
    campaign: one(campaigns, {
      fields: [referralCodes.campaignId],
      references: [campaigns.id],
    }),
    referrals: many(referrals),
  }),
);

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerUserId],
    references: [users.id],
    relationName: 'referralReferrer',
  }),
  referee: one(users, {
    fields: [referrals.refereeUserId],
    references: [users.id],
    relationName: 'referralReferee',
  }),
  referralCode: one(referralCodes, {
    fields: [referrals.referralCodeId],
    references: [referralCodes.id],
  }),
}));

// Subscription relations
export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [subscriptionPlans.organizationId],
      references: [organizations.id],
    }),
    items: many(subscriptionPlanItems),
    slots: many(subscriptionPlanSlots),
    subscriptions: many(subscriptions),
  }),
);

export const subscriptionPlanItemsRelations = relations(
  subscriptionPlanItems,
  ({ one }) => ({
    plan: one(subscriptionPlans, {
      fields: [subscriptionPlanItems.planId],
      references: [subscriptionPlans.id],
    }),
    variant: one(productVariants, {
      fields: [subscriptionPlanItems.variantId],
      references: [productVariants.id],
    }),
  }),
);

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    plan: one(subscriptionPlans, {
      fields: [subscriptions.planId],
      references: [subscriptionPlans.id],
    }),
    organization: one(organizations, {
      fields: [subscriptions.organizationId],
      references: [organizations.id],
    }),
    customer: one(users, {
      fields: [subscriptions.customerUserId],
      references: [users.id],
    }),
    customerAddress: one(customerAddresses, {
      fields: [subscriptions.customerAddressId],
      references: [customerAddresses.id],
    }),
    cycles: many(subscriptionCycles),
  }),
);

export const subscriptionCyclesRelations = relations(
  subscriptionCycles,
  ({ one }) => ({
    subscription: one(subscriptions, {
      fields: [subscriptionCycles.subscriptionId],
      references: [subscriptions.id],
    }),
    order: one(orders, {
      fields: [subscriptionCycles.orderId],
      references: [orders.id],
    }),
  }),
);

// Recommendation relations
export const categoryTimeBoostsRelations = relations(
  categoryTimeBoosts,
  ({ one }) => ({
    category: one(categories, {
      fields: [categoryTimeBoosts.categoryId],
      references: [categories.id],
    }),
  }),
);

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
