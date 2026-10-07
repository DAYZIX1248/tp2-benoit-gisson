type Result<T, E = string> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

type Slot = { startsAt: string; endsAt: string };

export default function freeSlots(date: string, reservations: Slot[]): Result<Slot[], string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "date invalide" };
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime()) || !d.toISOString().startsWith(date)) {
    return { ok: false, error: "date invalide" };
  }

  const dayStartStr = date + "T00:00:00.000Z";
  const dayStart = new Date(dayStartStr).getTime();
  d.setUTCDate(d.getUTCDate() + 1);
  const dayEnd = d.getTime();

  const relevantReservations = reservations
    .map(r => ({
      startsAt: new Date(r.startsAt).getTime(),
      endsAt: new Date(r.endsAt).getTime(),
      origStartsAt: r.startsAt,
      origEndsAt: r.endsAt
    }))
    .filter(r => !Number.isNaN(r.startsAt) && !Number.isNaN(r.endsAt))
    .filter(r => r.startsAt < dayEnd && r.endsAt > dayStart)
    .sort((a, b) => a.startsAt - b.startsAt);

  let currentStart = dayStart;
  const slots: Slot[] = [];

  for (const res of relevantReservations) {
    if (res.endsAt <= currentStart) {
      continue;
    }
    
    if (res.startsAt > currentStart) {
      const slotEnd = res.startsAt > dayEnd ? dayEnd : res.startsAt;
      if (slotEnd > currentStart) {
        slots.push({
          startsAt: new Date(currentStart).toISOString(),
          endsAt: new Date(slotEnd).toISOString()
        });
      }
    }
    
    const newStart = res.endsAt > dayEnd ? dayEnd : res.endsAt;
    if (newStart > currentStart) {
      currentStart = newStart;
    }
  }

  if (currentStart < dayEnd) {
    slots.push({
      startsAt: new Date(currentStart).toISOString(),
      endsAt: new Date(dayEnd).toISOString()
    });
  }

  return { ok: true, value: slots };
}
