import assert from "node:assert/strict";
import test from "node:test";
import { LogisticsStatus, OrderStatus } from "@prisma/client";
import {
  bookingBlocksConsumerCancel,
  canCancelOrder,
  canTransitionOrder,
  groupQtyByFarmer,
  orderStatusFromBookings,
} from "./orderStatus.ts";

test("groupQtyByFarmer merges one booking per farmer", () => {
  const groups = groupQtyByFarmer([
    { farmerId: "a", qty: 2 },
    { farmerId: "a", qty: 1 },
    { farmerId: "b", qty: 1 },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups.find((g) => g.farmerId === "a")?.qty, 3);
  assert.equal(groups.find((g) => g.farmerId === "b")?.qty, 1);
});

test("order is not delivered until every active booking is delivered", () => {
  const next = orderStatusFromBookings(
    [
      { status: LogisticsStatus.DELIVERED },
      { status: LogisticsStatus.IN_TRANSIT },
    ],
    OrderStatus.PICKED_UP
  );
  assert.equal(next, OrderStatus.IN_TRANSIT);
});

test("all delivered bookings map to DELIVERED", () => {
  const next = orderStatusFromBookings(
    [
      { status: LogisticsStatus.DELIVERED },
      { status: LogisticsStatus.DELIVERED },
    ],
    OrderStatus.OUT_FOR_DELIVERY
  );
  assert.equal(next, OrderStatus.DELIVERED);
});

test("cancel is blocked after pickup", () => {
  assert.equal(canCancelOrder(OrderStatus.PREPARING), true);
  assert.equal(canCancelOrder(OrderStatus.PICKED_UP), false);
  assert.equal(canTransitionOrder(OrderStatus.PICKED_UP, OrderStatus.CANCELLED), false);
});

test("COD_PENDING leaves payment-pending once a booking is picked up", () => {
  const next = orderStatusFromBookings(
    [{ status: LogisticsStatus.PICKED_UP }],
    OrderStatus.COD_PENDING
  );
  assert.equal(next, OrderStatus.PICKED_UP);
});

test("COD_PENDING mixed bookings are not delivered", () => {
  const next = orderStatusFromBookings(
    [
      { status: LogisticsStatus.DELIVERED },
      { status: LogisticsStatus.IN_TRANSIT },
    ],
    OrderStatus.COD_PENDING
  );
  assert.equal(next, OrderStatus.IN_TRANSIT);
});

test("unpaid ONLINE orders are not advanced by logistics", () => {
  const next = orderStatusFromBookings(
    [{ status: LogisticsStatus.DELIVERED }],
    OrderStatus.PENDING_PAYMENT
  );
  assert.equal(next, null);
});

test("cancel is blocked by pickup bookings even if order status lags", () => {
  assert.equal(canCancelOrder(OrderStatus.COD_PENDING), true);
  assert.equal(
    bookingBlocksConsumerCancel([{ status: LogisticsStatus.PICKED_UP }]),
    true
  );
  assert.equal(
    bookingBlocksConsumerCancel([{ status: LogisticsStatus.FARMER_READY }]),
    false
  );
});
