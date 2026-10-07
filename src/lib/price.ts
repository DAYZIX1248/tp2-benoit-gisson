// Tarification — repris du script de facturation (ticket FACT-88).
import type { Room } from "../store.js";

const WEEKEND_SURCHARGE = 20;

/**
 * Determine si une date tombe pendant le week-end (samedi ou dimanche UTC).
 */
export function isWeekend(startsAt: string): boolean {
  const day = new Date(startsAt).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Calcule le nombre d'heures entre deux dates ISO.
 */
export function hoursBetween(startsAt: string, endsAt: string): number {
  return (Date.parse(endsAt) - Date.parse(startsAt)) / 3600000;
}

/**
 * Calcule le prix d'une reservation avec majoration week-end eventuelle.
 */
export function priceFor(room: Room, startsAt: string, endsAt: string): number {
  const base = room.hourlyRate * hoursBetween(startsAt, endsAt);
  if (isWeekend(startsAt)) {
    return base + WEEKEND_SURCHARGE;
  }
  return base;
}
