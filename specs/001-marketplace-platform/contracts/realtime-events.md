# Contract: Realtime Events (cross-cutting, FR-026, FR-056, SC-007)

Server-pushed live updates over WebSocket (Socket.IO) with SSE fallback. Domain services write to Postgres and emit to an internal event bus; the gateway fans out to authorized, scoped channels. Updates arrive within 5s of the change without a manual refresh (SC-007).

## Connection & channel authorization
- Client connects with the Better Auth session cookie. The gateway resolves the same `ActorContext` and only subscribes the client to channels it is allowed to see (reuses the ability layer). Unauthorized subscription → rejected.

## Channels
| Channel | Subscribers | Events |
|---------|-------------|--------|
| `order:{orderId}` | order's customer, the vendor org, the assigned rider | `order.status_changed`, `order.item_swap_proposed`, `order.swap_resolved`, `order.payment_updated`, `order.rider_assigned` |
| `vendor:{orgId}` | vendor org members | `order.created`, `order.status_changed` (incoming orders board) |
| `rider:{riderId}` | that rider | `delivery.offered`, `delivery.offer_expired`, `delivery.assigned` |
| `parcel:{parcelId}` | sender, assigned rider | `parcel.status_changed`, `parcel.rider_assigned` |
| `delivery-tracking:{deliveryId}` | the delivery's customer/sender + vendor | `rider.location` (throttled GPS pings) |
| `user:{userId}` | that user | `notification` (lifecycle notifications, FR-054) |

## Event payload shape
```
{ "type": "order.status_changed", "channel": "order:abc", "at": "<iso>", "data": { ... } }
```

## Notes
- GPS `rider.location` is throttled (e.g. ≤1/2s per delivery) to limit chatter (research §1, hybrid option available).
- Cross-instance fan-out (if the API scales horizontally) uses the optional Redis adapter / Postgres LISTEN-NOTIFY (plan Complexity Tracking); single-instance v1 uses the in-process bus.
- No business logic imports the gateway; services emit bus events only (decoupled transport).
