import { describe, expect, it } from "vitest";
import {
  buildDocumentNumber,
  computeJewelryTotalPrice,
  computeReservationAmounts,
  computeSaleAmounts,
  ensureAvailableJewelryForReservation,
  ensureAvailableJewelryForSale,
} from "../../server/operations.js";

describe("server transaction helpers", () => {
  it("computes jewelry total price from unit price and weight", () => {
    expect(computeJewelryTotalPrice(12.5, 75_000)).toBe(937_500);
  });

  it("computes sale amounts from the client balance and jewelry price", () => {
    expect(computeSaleAmounts(50_000, 120_000)).toEqual({
      totalPrice: 120_000,
      paidFromBalance: 50_000,
      paidCash: 70_000,
    });
  });

  it("accepts a reservation deposit without requiring a stock price", () => {
    expect(computeReservationAmounts(0, 120_000)).toEqual({
      depositAmount: 120_000,
      remainingAmount: 0,
    });
  });

  it("allows selling any jewelry while stock remains", () => {
    expect(() =>
      ensureAvailableJewelryForSale({
        quantity: 1,
        status: "reserved",
      }),
    ).not.toThrow();
  });

  it("rejects reserving out of stock jewelry", () => {
    expect(() =>
      ensureAvailableJewelryForReservation({
        quantity: 0,
        status: "out_of_stock",
      }),
    ).toThrow("Ce bijou est indisponible pour une réservation.");
  });

  it("builds deterministic persisted document numbers", () => {
    expect(buildDocumentNumber("DEP", 42, "2026-04-25T10:15:00.000Z")).toBe("DEP-20260425-000042");
  });
});
