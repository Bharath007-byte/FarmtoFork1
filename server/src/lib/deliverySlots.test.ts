import assert from "node:assert/strict";
import test from "node:test";
import { slotIsBookable, slotIsInFuture } from "./deliverySlots.ts";

test("past slots cannot be selected", () => {
  const now = new Date("2026-09-06T12:00:00");
  const past = { date: new Date("2026-09-06T00:00:00"), startMin: 9 * 60, booked: 0, capacity: 2 };
  assert.equal(slotIsInFuture(past, now), false);
  assert.equal(slotIsBookable(past, now), false);
});

test("full slots cannot be selected even if in the future", () => {
  const now = new Date("2026-09-06T08:00:00");
  const full = { date: new Date("2026-09-06T00:00:00"), startMin: 14 * 60, booked: 2, capacity: 2 };
  assert.equal(slotIsInFuture(full, now), true);
  assert.equal(slotIsBookable(full, now), false);
});

test("open future slots can be selected", () => {
  const now = new Date("2026-09-06T08:00:00");
  const open = { date: new Date("2026-09-06T00:00:00"), startMin: 14 * 60, booked: 1, capacity: 2 };
  assert.equal(slotIsBookable(open, now), true);
});
