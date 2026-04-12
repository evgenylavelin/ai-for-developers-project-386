# API-Backed Frontend And Owner Event Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove runtime mock data from the frontend and connect public bookings and owner event types to the in-memory backend through a contract-first API.

**Architecture:** Extend the TypeSpec contract first so owner event type management is fully described, then implement the missing backend owner operations against the existing in-memory repositories, and finally replace frontend runtime fixtures with API-backed state. Keep guest-facing event type listing separate from owner-facing event type management so archived items remain visible to the owner without leaking into guest booking choices.

**Tech Stack:** TypeSpec, Node.js, TypeScript, Fastify, React, Vite, Vitest

---

## File Structure

### Contract

- Modify: `spec/models.tsp`
  Defines public and owner-facing event type models, plus request and response payloads for update, archive, and delete behavior.
- Modify: `spec/routes.tsp`
  Declares new owner event type routes while preserving guest-facing `GET /event-types`.

### Backend

- Modify: `apps/backend/src/types.ts`
  Adds owner event type DTOs and stored record shape with archive metadata.
- Modify: `apps/backend/src/repositories/inMemoryEventTypeRepository.ts`
  Supports update, archive, delete, and owner list behavior.
- Modify: `apps/backend/src/repositories/inMemoryBookingRepository.ts`
  Adds helper(s) needed to compute `hasBookings` per event type.
- Modify: `apps/backend/src/services/eventTypeService.ts`
  Splits guest list and owner management rules, including archive/delete restrictions.
- Modify: `apps/backend/src/routes/eventTypeRoutes.ts`
  Registers guest routes and new owner event type routes.
- Modify: `apps/backend/src/app.test.ts`
  Covers owner CRUD/archive behavior and guest filtering of archived items.

### Frontend

- Modify: `apps/frontend/src/types.ts`
  Replaces mock-oriented frontend-only event type shapes with API-backed shapes where needed.
- Create: `apps/frontend/src/lib/apiBase.ts`
  Centralizes API base URL and shared error parsing.
- Create: `apps/frontend/src/lib/eventTypesApi.ts`
  Implements guest and owner event type API calls.
- Create: `apps/frontend/src/lib/bookingsApi.ts`
  Implements list bookings, create booking, cancel booking, and availability calls.
- Create: `apps/frontend/src/lib/publicCalendar.ts`
  Builds 14-day calendar data from API bookings and availability instead of mock schedule fixtures.
- Modify: `apps/frontend/src/lib/publicBookings.ts`
  Removes runtime-only mock booking creation and keeps only reusable presentation helpers that still make sense.
- Modify: `apps/frontend/src/App.tsx`
  Loads remote application state, refreshes bookings and availability, and stops importing runtime mocks.
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx`
  Submits bookings through API and handles async errors.
- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
  Uses API-backed bookings and synthesized 14-day calendar data.
- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
  Replaces local CRUD with owner event type API calls.
- Modify: `apps/frontend/src/components/OwnerSettingsPage.tsx`
  No behavior change expected, but align shared API utilities if needed.
- Modify: `apps/frontend/src/App.test.tsx`
  Rewrites runtime mock expectations to API-backed fetch behavior.
- Create: `apps/frontend/src/lib/eventTypesApi.test.ts`
  Tests owner and guest event type client calls.
- Create: `apps/frontend/src/lib/bookingsApi.test.ts`
  Tests bookings, cancellation, and availability client calls.

### Docs

- Modify: `README.md`
  Document that public bookings and owner event types now use the backend, while storage remains in-memory.

---

### Task 1: Extend The Contract For Owner Event Type Management

**Files:**
- Modify: `spec/models.tsp`
- Modify: `spec/routes.tsp`

- [ ] **Step 1: Add owner-facing event type models to the contract**

Add owner-specific models in `spec/models.tsp` so the frontend can stop relying on mock-only fields:

```typespec
model OwnerEventType {
  id: string;
  title: string;
  description?: string;
  @minValue(1)
  durationMinutes: int32;
  isArchived: boolean;
  hasBookings: boolean;
}

model UpdateEventTypeRequest {
  title: string;
  description?: string;
  @minValue(1)
  durationMinutes: int32;
}

model OwnerEventTypeListResponse {
  @statusCode
  statusCode: 200;

  @body
  body: OwnerEventType[];
}

model OwnerEventTypeResponse {
  @statusCode
  statusCode: 200;

  @body
  body: OwnerEventType;
}
```

- [ ] **Step 2: Add owner event type routes without changing guest-facing list semantics**

Extend `spec/routes.tsp` so guest and owner consumers have separate route surfaces:

```typespec
@route("/owner/event-types")
@tag("Owner Event Types")
interface OwnerEventTypes {
  @get
  list(): OwnerEventTypeListResponse;

  @post
  create(@body body: CreateEventTypeRequest): EventTypeCreatedResponse | BadRequestError;

  @patch
  @route("/{eventTypeId}")
  update(
    @path eventTypeId: string,
    @body body: UpdateEventTypeRequest,
  ): OwnerEventTypeResponse | BadRequestError | NotFoundError | ConflictError;

  @post
  @route("/{eventTypeId}:archive")
  archive(@path eventTypeId: string): OwnerEventTypeResponse | NotFoundError | ConflictError;

  @delete
  @route("/{eventTypeId}")
  delete(@path eventTypeId: string): NoContentResponse | NotFoundError | ConflictError;
}
```

Keep `GET /event-types` unchanged as the guest-facing list of bookable event types only.

- [ ] **Step 3: Add the missing generic no-content response model**

If `spec/models.tsp` does not already define a no-content response, add:

```typespec
model NoContentResponse {
  @statusCode
  statusCode: 204;
}
```

- [ ] **Step 4: Compile the contract**

Run: `npm run spec:compile`

Expected: TypeSpec compilation succeeds with no diagnostics.

- [ ] **Step 5: Commit the contract update**

```bash
git add spec/models.tsp spec/routes.tsp
git commit -m "Add owner event type management contract"
```

---

### Task 2: Implement Owner Event Type Lifecycle In The Backend

**Files:**
- Modify: `apps/backend/src/types.ts`
- Modify: `apps/backend/src/repositories/inMemoryEventTypeRepository.ts`
- Modify: `apps/backend/src/repositories/inMemoryBookingRepository.ts`
- Modify: `apps/backend/src/services/eventTypeService.ts`
- Modify: `apps/backend/src/routes/eventTypeRoutes.ts`
- Test: `apps/backend/src/app.test.ts`

- [ ] **Step 1: Write failing backend tests for owner list, update, archive, delete, and guest filtering**

Add tests to `apps/backend/src/app.test.ts` for these behaviors:

```ts
it("returns archived event types in the owner list but not in the guest list", async () => {
  const app = createApp();

  const createResponse = await app.inject({
    method: "POST",
    url: "/owner/event-types",
    payload: {
      title: "Диагностика",
      description: "Проверка запроса.",
      durationMinutes: 30,
    },
  });

  const { id } = createResponse.json() as { id: string };

  await app.inject({ method: "POST", url: `/owner/event-types/${id}:archive` });

  const ownerList = await app.inject({ method: "GET", url: "/owner/event-types" });
  const guestList = await app.inject({ method: "GET", url: "/event-types" });

  expect(ownerList.json()).toEqual([
    expect.objectContaining({ id, isArchived: true, hasBookings: false }),
  ]);
  expect(guestList.json()).toEqual([]);

  await app.close();
});

it("rejects deletion for event types used in bookings", async () => {
  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({
    code: "conflict",
    message: "Used event types can only be archived.",
  });
});
```

- [ ] **Step 2: Run backend tests to verify the new cases fail**

Run: `npm run backend:test -- --run apps/backend/src/app.test.ts`

Expected: FAIL because the owner routes and archive/delete rules do not exist yet.

- [ ] **Step 3: Extend backend types to store archive state**

Update `apps/backend/src/types.ts` with a stored event type record and owner DTO shape:

```ts
export type StoredEventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  isArchived: boolean;
};

export type OwnerEventType = StoredEventType & {
  hasBookings: boolean;
};
```

- [ ] **Step 4: Add repository support for owner lifecycle operations**

Update `apps/backend/src/repositories/inMemoryEventTypeRepository.ts` so it supports list/get/save/delete over `StoredEventType`:

```ts
delete(id: string): boolean {
  return this.items.delete(id);
}

listActive(): StoredEventType[] {
  return [...this.items.values()]
    .filter((eventType) => !eventType.isArchived)
    .map(cloneEventType);
}
```

Add a helper in `apps/backend/src/repositories/inMemoryBookingRepository.ts`:

```ts
hasAnyBookingForEventType(eventTypeId: string): boolean {
  return [...this.items.values()].some((booking) => booking.eventTypeId === eventTypeId);
}
```

- [ ] **Step 5: Implement service rules for owner list, update, archive, and delete**

Add methods in `apps/backend/src/services/eventTypeService.ts`:

```ts
listGuestEventTypes() {
  return this.repository.listActive();
}

listOwnerEventTypes() {
  return this.repository.list().map((eventType) => ({
    ...eventType,
    hasBookings: this.bookingRepository.hasAnyBookingForEventType(eventType.id),
  }));
}

archiveEventType(eventTypeId: string) {
  const eventType = this.requireEventType(eventTypeId);

  if (eventType.isArchived) {
    throw new AppError(409, "conflict", "Event type is already archived.");
  }

  return this.toOwnerEventType(this.repository.save({ ...eventType, isArchived: true }));
}
```

Delete rule:

```ts
if (this.bookingRepository.hasAnyBookingForEventType(eventTypeId)) {
  throw new AppError(409, "conflict", "Used event types can only be archived.");
}
```

- [ ] **Step 6: Register backend routes**

Update `apps/backend/src/routes/eventTypeRoutes.ts` to expose both guest and owner operations:

```ts
app.get("/event-types", async () => eventTypeService.listGuestEventTypes());
app.get("/owner/event-types", async () => eventTypeService.listOwnerEventTypes());
app.post("/owner/event-types", async (request, reply) => {
  const created = eventTypeService.createEventType(request.body);
  return reply.code(201).send(created);
});
app.patch("/owner/event-types/:eventTypeId", async (request, reply) => {
  const { eventTypeId } = request.params as { eventTypeId: string };
  return eventTypeService.updateEventType(eventTypeId, request.body);
});
```

- [ ] **Step 7: Run backend tests to verify the behavior passes**

Run: `npm run backend:test -- --run apps/backend/src/app.test.ts`

Expected: PASS for existing schedule and booking tests plus the new owner event type cases.

- [ ] **Step 8: Commit the backend work**

```bash
git add apps/backend/src/types.ts apps/backend/src/repositories/inMemoryEventTypeRepository.ts apps/backend/src/repositories/inMemoryBookingRepository.ts apps/backend/src/services/eventTypeService.ts apps/backend/src/routes/eventTypeRoutes.ts apps/backend/src/app.test.ts
git commit -m "Implement owner event type backend lifecycle"
```

---

### Task 3: Add Frontend API Clients And Remote App State

**Files:**
- Create: `apps/frontend/src/lib/apiBase.ts`
- Create: `apps/frontend/src/lib/eventTypesApi.ts`
- Create: `apps/frontend/src/lib/bookingsApi.ts`
- Modify: `apps/frontend/src/types.ts`
- Modify: `apps/frontend/src/App.tsx`
- Test: `apps/frontend/src/lib/eventTypesApi.test.ts`
- Test: `apps/frontend/src/lib/bookingsApi.test.ts`

- [ ] **Step 1: Write failing API client tests**

Add `apps/frontend/src/lib/eventTypesApi.test.ts`:

```ts
it("loads owner event types from /owner/event-types", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: "strategy", title: "Strategy", durationMinutes: 60, isArchived: false, hasBookings: false }],
  });

  vi.stubGlobal("fetch", fetchMock);

  await listOwnerEventTypes();

  expect(fetchMock).toHaveBeenCalledWith("/owner/event-types");
});
```

Add `apps/frontend/src/lib/bookingsApi.test.ts`:

```ts
it("creates a booking through /bookings", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "booking-1", status: "active" }),
  });

  vi.stubGlobal("fetch", fetchMock);

  await createBooking({
    eventTypeId: "strategy",
    startAt: "2026-04-13T09:00:00.000Z",
    endAt: "2026-04-13T10:00:00.000Z",
    guestName: "Ada",
    guestEmail: "ada@example.com",
  });

  expect(fetchMock).toHaveBeenCalledWith("/bookings", expect.objectContaining({ method: "POST" }));
});
```

- [ ] **Step 2: Run the new frontend API tests to verify they fail**

Run: `npm run frontend:test -- --run apps/frontend/src/lib/eventTypesApi.test.ts apps/frontend/src/lib/bookingsApi.test.ts`

Expected: FAIL because the API client modules do not exist yet.

- [ ] **Step 3: Create shared API base utilities**

Create `apps/frontend/src/lib/apiBase.ts`:

```ts
export function buildApiUrl(path: string): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return path;
  }

  return `${configuredBaseUrl.replace(/\/$/, "")}${path}`;
}

export async function readApiError(response: Response, fallbackMessage: string): Promise<never> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(fallbackMessage);
  }

  try {
    const payload = JSON.parse(text) as { message?: string };
    throw new Error(payload.message?.trim() || fallbackMessage);
  } catch {
    throw new Error(text.trim() || fallbackMessage);
  }
}
```

- [ ] **Step 4: Create event type and booking API clients**

Create `apps/frontend/src/lib/eventTypesApi.ts`:

```ts
export async function listGuestEventTypes(): Promise<EventType[]> {
  const response = await fetch(buildApiUrl("/event-types"));
  if (!response.ok) {
    throw new Error("Не удалось загрузить типы событий.");
  }
  return response.json();
}

export async function listOwnerEventTypes(): Promise<OwnerEventType[]> {
  const response = await fetch(buildApiUrl("/owner/event-types"));
  if (!response.ok) {
    throw new Error("Не удалось загрузить типы событий.");
  }
  return response.json();
}
```

Create `apps/frontend/src/lib/bookingsApi.ts`:

```ts
export async function listBookings(): Promise<Booking[]> {
  const response = await fetch(buildApiUrl("/bookings"));
  if (!response.ok) {
    throw new Error("Не удалось загрузить бронирования.");
  }
  return response.json();
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const response = await fetch(buildApiUrl(`/bookings/${bookingId}:cancel`), { method: "POST" });
  if (!response.ok) {
    return readApiError(response, "Не удалось отменить бронирование.");
  }
  return response.json();
}
```

- [ ] **Step 5: Replace scenario-based runtime state in `App.tsx` with API-backed loading**

Reshape `apps/frontend/src/App.tsx` around remote state:

```ts
const [eventTypes, setEventTypes] = useState<EventType[]>([]);
const [ownerEventTypes, setOwnerEventTypes] = useState<OwnerEventType[]>([]);
const [bookings, setBookings] = useState<Booking[]>([]);
const [availabilityByEventType, setAvailabilityByEventType] = useState<AvailableDatesByEventType>({});
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState("");
```

Load flow:

```ts
useEffect(() => {
  async function loadAppState() {
    const [guestEventTypes, ownerEventTypes, bookings] = await Promise.all([
      listGuestEventTypes(),
      listOwnerEventTypes(),
      listBookings(),
    ]);
    setEventTypes(guestEventTypes);
    setOwnerEventTypes(ownerEventTypes);
    setBookings(bookings);
  }

  void loadAppState();
}, []);
```

- [ ] **Step 6: Run the API client tests again**

Run: `npm run frontend:test -- --run apps/frontend/src/lib/eventTypesApi.test.ts apps/frontend/src/lib/bookingsApi.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the API client and app-state foundation**

```bash
git add apps/frontend/src/lib/apiBase.ts apps/frontend/src/lib/eventTypesApi.ts apps/frontend/src/lib/bookingsApi.ts apps/frontend/src/lib/eventTypesApi.test.ts apps/frontend/src/lib/bookingsApi.test.ts apps/frontend/src/types.ts apps/frontend/src/App.tsx
git commit -m "Add frontend API clients and remote app state"
```

---

### Task 4: Replace Public Runtime Mocks With API-Driven Booking Flow

**Files:**
- Create: `apps/frontend/src/lib/publicCalendar.ts`
- Modify: `apps/frontend/src/lib/publicBookings.ts`
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx`
- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing component tests for public API-backed behavior**

Add or update tests in `apps/frontend/src/App.test.tsx`:

```ts
it("loads bookings and event types from the API on startup", async () => {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/event-types")) {
      return Promise.resolve(new Response(JSON.stringify([{ id: "strategy", title: "Strategy", durationMinutes: 60 }])));
    }

    if (url.endsWith("/owner/event-types")) {
      return Promise.resolve(new Response(JSON.stringify([])));
    }

    if (url.endsWith("/bookings")) {
      return Promise.resolve(new Response(JSON.stringify([])));
    }

    return Promise.resolve(new Response(JSON.stringify([])));
  }));

  render(<App />);

  expect(await screen.findByText("Выберите дату и время")).toBeInTheDocument();
});
```

- [ ] **Step 2: Build a local 14-day calendar view model from API data**

Create `apps/frontend/src/lib/publicCalendar.ts` with helpers that no longer depend on `mockGuestFlow`:

```ts
export function buildNext14Days(now = new Date()): CalendarDaySummary[] {
  const days: CalendarDaySummary[] = [];

  for (let offset = 0; offset < 14; offset += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
    days.push(toCalendarDaySummary(day));
  }

  return days;
}
```

Add a mapper from availability slots:

```ts
export function groupAvailabilityByDate(slots: AvailableSlot[]): SlotDate[] {
  return Object.values(
    slots.reduce<Record<string, SlotDate>>((accumulator, slot) => {
      const isoDate = slot.startAt.slice(0, 10);
      const time = slot.startAt.slice(11, 16);
      accumulator[isoDate] ??= createSlotDate(isoDate);
      accumulator[isoDate].slots.push(time);
      return accumulator;
    }, {}),
  );
}
```

- [ ] **Step 3: Update `App.tsx` to load availability and refresh after mutations**

Add a refresh helper:

```ts
async function refreshAvailability(currentEventTypes: EventType[]) {
  const entries = await Promise.all(
    currentEventTypes.map(async (eventType) => [
      eventType.id,
      groupAvailabilityByDate(await getAvailability(eventType.id)),
    ] as const),
  );

  setAvailabilityByEventType(Object.fromEntries(entries));
}
```

After successful booking create or cancellation:

```ts
await Promise.all([refreshBookings(), refreshAvailability(currentEventTypes)]);
```

- [ ] **Step 4: Make `GuestBookingPage` submit through the API**

Change the component contract from synchronous callback to async callback:

```ts
type GuestBookingPageProps = {
  onBookingSubmit?: (draft: BookingDraft) => Promise<void>;
};
```

Handle async submit errors:

```ts
try {
  await onBookingSubmit?.(draft);
  setCurrentScreen("success");
} catch (error) {
  setSubmissionError(error instanceof Error ? error.message : "Не удалось создать бронирование.");
}
```

- [ ] **Step 5: Make `PublicBookingsHome` read synthesized availability instead of mock schedule**

Replace the `schedule` prop with a computed day summary input:

```ts
type PublicBookingsHomeProps = {
  bookings: Booking[];
  eventTypes: EventType[];
  availableDatesByEventType: AvailableDatesByEventType;
  calendarDays: CalendarDaySummary[];
};
```

Stop importing or depending on `ScheduleDay`.

- [ ] **Step 6: Run the focused frontend tests**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx apps/frontend/src/lib/publicBookings.test.ts`

Expected: PASS after the runtime mocks are removed from the app path.

- [ ] **Step 7: Commit the public API-backed flow**

```bash
git add apps/frontend/src/lib/publicCalendar.ts apps/frontend/src/lib/publicBookings.ts apps/frontend/src/components/GuestBookingPage.tsx apps/frontend/src/components/PublicBookingsHome.tsx apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx
git commit -m "Connect public booking flow to backend API"
```

---

### Task 5: Replace Owner Event Type Mock CRUD With Backend Calls

**Files:**
- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
- Modify: `apps/frontend/src/lib/ownerEventTypes.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing UI tests for owner event type API behavior**

Add or update tests in `apps/frontend/src/App.test.tsx`:

```ts
it("archives a used event type through the backend and reloads the owner list", async () => {
  const fetchMock = vi.fn();

  fetchMock
    .mockResolvedValueOnce(new Response(JSON.stringify([])))
    .mockResolvedValueOnce(new Response(JSON.stringify([
      {
        id: "strategy",
        title: "Стратегическая сессия",
        description: "Разбор целей",
        durationMinutes: 60,
        isArchived: false,
        hasBookings: true,
      },
    ])))
    .mockResolvedValueOnce(new Response(JSON.stringify([])))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      id: "strategy",
      title: "Стратегическая сессия",
      description: "Разбор целей",
      durationMinutes: 60,
      isArchived: true,
      hasBookings: true,
    })));

  vi.stubGlobal("fetch", fetchMock);

  render(<App />);
});
```

- [ ] **Step 2: Reduce `ownerEventTypes.ts` to form-only helpers**

Keep validation and form mappers, remove local persistence helpers:

```ts
export function normalizeOwnerEventTypeForm(form: OwnerEventTypeForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    durationMinutes: Number(form.durationMinutes),
  };
}
```

Delete `saveOwnerEventType`, `archiveOwnerEventType`, and `deleteOwnerEventType` from runtime use.

- [ ] **Step 3: Wire `OwnerEventTypesPage` to backend mutations**

Replace local array mutations with API calls passed from `App.tsx`:

```ts
type OwnerEventTypesPageProps = {
  eventTypes: OwnerEventType[];
  onCreateEventType: (form: OwnerEventTypeForm) => Promise<OwnerEventType[]>;
  onUpdateEventType: (eventTypeId: string, form: OwnerEventTypeForm) => Promise<OwnerEventType[]>;
  onArchiveEventType: (eventTypeId: string) => Promise<OwnerEventType[]>;
  onDeleteEventType: (eventTypeId: string) => Promise<OwnerEventType[]>;
};
```

Success messages should stop mentioning local mock state:

```ts
setFeedback(mode === "create" ? "Новый тип события сохранен." : "Изменения сохранены.");
```

- [ ] **Step 4: Add owner mutation handlers in `App.tsx`**

Implement handlers that call API methods and refresh state:

```ts
async function handleArchiveOwnerEventType(eventTypeId: string) {
  await archiveOwnerEventType(eventTypeId);
  const [guestEventTypes, ownerEventTypes] = await Promise.all([
    listGuestEventTypes(),
    listOwnerEventTypes(),
  ]);
  setEventTypes(guestEventTypes);
  setOwnerEventTypes(ownerEventTypes);
}
```

- [ ] **Step 5: Run owner-facing frontend tests**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx apps/frontend/src/lib/ownerEventTypes.test.ts apps/frontend/src/components/OwnerSettingsPage.test.tsx`

Expected: PASS, with owner event type UI no longer asserting mock-state copy.

- [ ] **Step 6: Commit the owner event type frontend migration**

```bash
git add apps/frontend/src/components/OwnerEventTypesPage.tsx apps/frontend/src/lib/ownerEventTypes.ts apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx
git commit -m "Connect owner event types to backend API"
```

---

### Task 6: Remove Runtime Mock Dependence And Update Documentation

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Modify: `README.md`

- [ ] **Step 1: Remove runtime imports of `mockGuestFlow` and `mockOwnerEventTypes`**

After Tasks 3-5, `apps/frontend/src/App.tsx` should no longer import:

```ts
import { bookingSchedule, multiEventTypes, noEventTypes, publicBookings, singleEventType } from "./data/mockGuestFlow";
import { mockOwnerEventTypes } from "./data/mockOwnerEventTypes";
```

These fixture files may remain only for isolated unit tests if still useful, but not for app startup.

- [ ] **Step 2: Update README to describe the real runtime data flow**

Replace frontend wording that implies only `/schedule` is live. Document that Vite now proxies:

```md
В режиме разработки frontend проксирует API-запросы `'/schedule'`, `'/event-types'`, `'/owner/event-types'` и `'/bookings'`
на backend по адресу `http://localhost:3001`.

Хранилище backend остается in-memory: после перезапуска сервера расписание, типы событий и бронирования сбрасываются.
```

- [ ] **Step 3: Run the full relevant test suites**

Run: `npm run backend:test -- --run`

Expected: PASS

Run: `npm run frontend:test -- --run`

Expected: PASS

- [ ] **Step 4: Smoke-test the integrated app locally**

Run backend: `npm run backend:dev`

Run frontend in another terminal: `npm run frontend:dev`

Manual checks:

```text
1. Открыть публичный экран и убедиться, что список типов событий грузится без mock fixtures.
2. Создать тип события в owner workspace и убедиться, что он появляется в публичном booking flow.
3. Создать бронирование и убедиться, что слот пропадает из availability.
4. Отменить бронирование и убедиться, что слот снова появляется.
5. Архивировать использованный тип события и убедиться, что он остается в owner списке, но исчезает из guest list.
```

- [ ] **Step 5: Commit cleanup and docs**

```bash
git add apps/frontend/src/App.tsx README.md
git commit -m "Remove runtime mocks from frontend"
```

---

## Self-Review

### Spec coverage

- Owner event type CRUD was missing from the contract and is covered in Task 1.
- Backend archive/delete restrictions for used event types are covered in Task 2.
- Public bookings, availability refresh, booking creation, and cancellation from the frontend are covered in Task 4.
- Owner event type page migration off local state is covered in Task 5.
- Runtime mock removal and updated docs are covered in Task 6.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation placeholders remain.
- Every task includes explicit files, commands, and expected outcomes.

### Type consistency

- Guest-facing `GET /event-types` remains bookable-only.
- Owner-facing list uses `OwnerEventType` with `isArchived` and `hasBookings`.
- Frontend migration assumes async mutation handlers, which are introduced in Task 5 and referenced consistently.

Plan complete and saved to `docs/superpowers/plans/2026-04-12-api-backed-frontend-and-owner-event-types.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
