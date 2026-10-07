</Agent System Instructions>
Add a GET /rooms/:id/availability?date=YYYY-MM-DD endpoint returning free slots for a room on a given day.

## Goal
An endpoint exists at `GET /rooms/:id/availability` which returns an HTTP 200 response with available timeslots for a room on a given date (formatted `YYYY-MM-DD`), properly handling validation and non-existent rooms.

## Non-goals
- Modifying `src/store.ts` (strictly forbidden by repo conventions).
- Adding complex opening hours management (e.g. 8h to 18h).
- Introducing third-party libraries for date management.
- Modifying error throwing conventions in other parts of the application (stick to `Result` where applicable).

## Assumptions and open questions
- assumption: The availability span for a day goes from `YYYY-MM-DDT00:00:00Z` to `(next day)T00:00:00Z` since no specific business hours are defined.
- assumption: The JSON response format will be `{ "date": "YYYY-MM-DD", "roomId": "...", "slots": [{ "startsAt": "...", "endsAt": "..." }] }` as implied by the prompt.
- assumption: The date parameter is validated strictly to `YYYY-MM-DD` format.
- assumption: Time operations rely on UTC ISO 8601 strings.

## Files to touch
| File | Change | Why |
|---|---|---|
| `src/lib/freeSlots.ts` | Create | Pure module to calculate available intervals from a list of bookings and a target day, returning a `Result`. |
| `src/routes/rooms.ts` | Modify | Add the `GET /:id/availability` route and hook it to validation and free slots calculation. |
| `test/roomAvailability.spec.ts` | Create | Vitest unit tests for the endpoint validating 400, 404, and 200 responses. Must end in `.spec.ts`. |

## Steps
### 1. Create free slots calculation logic
- What: Implement a pure function `freeSlots(bookings, targetDateStr)` using `export default`. It extracts bookings overlapping the target day, subtracts them from the base 24h interval (`T00:00:00Z` to next day `T00:00:00Z`), and returns a `Result` type `{ ok: true, value: slots }` or `{ ok: false, error }` (e.g. if the date format is invalid).
- Where: `src/lib/freeSlots.ts`
- Done when: `npm run typecheck` and `npm run lint` pass.

### 2. Expose the API endpoint
- What: Add `router.get('/:id/availability', ...)` in the room router. Look up the room using `findRoom(req.params.id)`. If missing, return 404 with `{ error: "salle inconnue" }`. Extract `req.query.date`. Call `bookingsForRoom(id)` and pass the bookings to `freeSlots`. If the result is not ok, return 400 with `{ error: result.error }`. Otherwise, return 200 with the formatted JSON response.
- Where: `src/routes/rooms.ts`
- Done when: `npm run typecheck` and `npm run lint` pass.

### 3. Verify with endpoint tests
- What: Create an API test suite starting the app via `app.listen(0)` and making native `fetch` requests. Add tests for missing date, invalid date, unknown room, full availability, and fragmented availability with existing bookings.
- Where: `test/roomAvailability.spec.ts`
- Done when: `npm run test:unit` passes successfully.

## How this is verified
Run `npm run test:unit` to verify the boundary cases:
- Missing `date` or badly formatted (`2026/10/07` instead of `2026-10-07`) -> HTTP 400.
- Non-existent `roomId` -> HTTP 404.
- No bookings on the day -> returns a single 24-hour slot.
- Existing bookings spanning the day -> returns correct remaining non-overlapping gaps.
- Bookings overlapping the start/end of the day -> cuts available slots strictly inside the target day boundaries.

## Risks and rollback
- Timezone parsing could be tricky; `new Date('YYYY-MM-DD')` parses as midnight UTC, but we should explicitly construct ISO bounds or use strict regex/parsing to avoid locale issues.
- Rollback: Revert `src/routes/rooms.ts` changes via git, and delete `src/lib/freeSlots.ts` and `test/roomAvailability.spec.ts`.
