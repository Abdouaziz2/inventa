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

  it("rejects reservation deposits above the jewelry price", () => {
    expect(() => computeReservationAmounts(100_000, 120_000)).toThrow(
      "L'acompte ne peut pas dépasser le prix du bijou.",
    );
  });

  it("rejects selling non-available jewelry", () => {
    expect(() =>
      ensureAvailableJewelryForSale({
        quantity: 1,
        status: "reserved",
      }),
    ).toThrow("Ce bijou ne peut pas être vendu dans son statut actuel.");
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
