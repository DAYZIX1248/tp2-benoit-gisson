import { describe, it, expect } from "vitest";
import freeSlots from "../src/lib/freeSlots.js";

describe("freeSlots", () => {
  it("retourne une erreur si la date est invalide", () => {
    expect(freeSlots("2024-02-30", [])).toEqual({ ok: false, error: "date invalide" });
    expect(freeSlots("invalid", [])).toEqual({ ok: false, error: "date invalide" });
    expect(freeSlots("2024/02/20", [])).toEqual({ ok: false, error: "date invalide" });
  });

  it("journee sans reservation retourne tout le jour", () => {
    const res = freeSlots("2024-10-07", []);
    expect(res).toEqual({
      ok: true,
      value: [
        { startsAt: "2024-10-07T00:00:00.000Z", endsAt: "2024-10-08T00:00:00.000Z" }
      ]
    });
  });

  it("reservation au milieu de la journee", () => {
    const res = freeSlots("2024-10-07", [
      { startsAt: "2024-10-07T10:00:00.000Z", endsAt: "2024-10-07T14:00:00.000Z" }
    ]);
    expect(res).toEqual({
      ok: true,
      value: [
        { startsAt: "2024-10-07T00:00:00.000Z", endsAt: "2024-10-07T10:00:00.000Z" },
        { startsAt: "2024-10-07T14:00:00.000Z", endsAt: "2024-10-08T00:00:00.000Z" }
      ]
    });
  });

  it("reservations multiples/chevauchantes", () => {
    const res = freeSlots("2024-10-07", [
      { startsAt: "2024-10-07T10:00:00.000Z", endsAt: "2024-10-07T12:00:00.000Z" },
      { startsAt: "2024-10-07T11:00:00.000Z", endsAt: "2024-10-07T14:00:00.000Z" },
      { startsAt: "2024-10-07T16:00:00.000Z", endsAt: "2024-10-07T18:00:00.000Z" }
    ]);
    expect(res).toEqual({
      ok: true,
      value: [
        { startsAt: "2024-10-07T00:00:00.000Z", endsAt: "2024-10-07T10:00:00.000Z" },
        { startsAt: "2024-10-07T14:00:00.000Z", endsAt: "2024-10-07T16:00:00.000Z" },
        { startsAt: "2024-10-07T18:00:00.000Z", endsAt: "2024-10-08T00:00:00.000Z" }
      ]
    });
  });

  it("reservation qui deborde du jour", () => {
    const res = freeSlots("2024-10-07", [
      { startsAt: "2024-10-06T20:00:00.000Z", endsAt: "2024-10-07T08:00:00.000Z" },
      { startsAt: "2024-10-07T22:00:00.000Z", endsAt: "2024-10-08T05:00:00.000Z" }
    ]);
    expect(res).toEqual({
      ok: true,
      value: [
        { startsAt: "2024-10-07T08:00:00.000Z", endsAt: "2024-10-07T22:00:00.000Z" }
      ]
    });
  });

  it("journee entierement occupee", () => {
    const res = freeSlots("2024-10-07", [
      { startsAt: "2024-10-06T12:00:00.000Z", endsAt: "2024-10-08T12:00:00.000Z" }
    ]);
    expect(res).toEqual({
      ok: true,
      value: []
    });
  });
});
