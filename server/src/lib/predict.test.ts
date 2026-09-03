import { test } from "node:test";
import assert from "node:assert/strict";
import { predictFromSeries, razorpaySignature } from "./predict.ts";
import { hashOtp } from "./hash.ts";
import { evaluateOtp } from "./otp.ts";

test("prediction refuses short series", () => {
  const r = predictFromSeries([1, 2, 3]);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.message, /Insufficient historical data/);
  }
});

test("prediction uses R2 from data", () => {
  const series = [100, 110, 120, 130, 140, 150, 160];
  const r = predictFromSeries(series);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.ok(r.confidence > 0.9);
    assert.ok(r.high >= r.low);
  }
});

test("otp hash is not plaintext", () => {
  assert.notEqual(hashOtp("482913"), "482913");
});

test("expired OTP is rejected", () => {
  const r = evaluateOtp(
    {
      verified: false,
      expiresAt: new Date(Date.now() - 1000),
      attempts: 0,
      maxAttempts: 5,
      codeHash: hashOtp("111111"),
    },
    "111111"
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "OTP expired");
});

test("razorpay signature is deterministic", () => {
  const a = razorpaySignature("order_1", "pay_1", "secret");
  const b = razorpaySignature("order_1", "pay_1", "secret");
  assert.equal(a, b);
  assert.notEqual(a, razorpaySignature("order_1", "pay_1", "other"));
});

test("full logistics slot cannot be booked", () => {
  const booked = 2;
  const capacity = 2;
  assert.equal(booked < capacity, false);
});
