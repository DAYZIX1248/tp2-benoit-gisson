import { Router } from "express";
import { rooms, findRoom, bookingsForRoom } from "../store.js";
import freeSlots from "../lib/freeSlots.js";

export const roomsRouter = Router();

roomsRouter.get("/", (_req, res) => {
  res.json({ rooms });
});

roomsRouter.get("/:id", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  res.json({ room, bookings: bookingsForRoom(room.id) });
});

roomsRouter.get("/:id/availability", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }

  const { date } = req.query;
  if (typeof date !== "string") {
    res.status(400).json({ error: "date requise" });
    return;
  }

  const bookings = bookingsForRoom(room.id);
  const result = freeSlots(date, bookings);

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    date,
    roomId: room.id,
    slots: result.value
  });
});
