import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";

async function call(path: string, init?: RequestInit) {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("GET /rooms/:id/availability", () => {
  it("retourne 404 pour une salle inconnue", async () => {
    const res = await call("/rooms/salle-fantome/availability?date=2026-10-05");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "salle inconnue" });
  });

  it("retourne 400 si le parametre date est absent", async () => {
    const res = await call("/rooms/salle-a/availability");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "date requise" });
  });

  it("retourne 400 pour une date invalide", async () => {
    const invalidDates = ["invalide", "2026-02-30", "2026/10/05"];
    for (const d of invalidDates) {
      const res = await call(`/rooms/salle-a/availability?date=${d}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "date invalide" });
    }
  });

  it("retourne le creneau complet si aucune reservation sur la journee", async () => {
    const res = await call("/rooms/salle-b/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      date: "2026-10-05",
      roomId: "salle-b",
      slots: [
        { startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }
      ]
    });
  });

  it("retourne les creneaux restants si la salle a des reservations", async () => {
    // salle-a a une réservation bk-1001 de 09:00 à 11:00 le 2026-10-05
    const res = await call("/rooms/salle-a/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      date: "2026-10-05",
      roomId: "salle-a",
      slots: [
        { startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-05T09:00:00.000Z" },
        { startsAt: "2026-10-05T11:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }
      ]
    });
  });
});
