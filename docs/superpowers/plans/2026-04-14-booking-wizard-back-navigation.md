# Booking Wizard Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the guest booking wizard open on step `2/3` when the public screen already has a selected event type, while keeping a visible `Назад` action on every step and returning step `1/3` back to the public bookings context.

**Architecture:** Extend the guest-flow entry model so `GuestBookingPage` can distinguish between a plain multi-type flow and a prefilled public entry. Keep the stepper permanently three-step for multi-type flows, move first-step exit behavior through an explicit callback instead of history, and update app-level wiring so the public home passes the selected event type and receives the close action. Cover the behavior with flow-level tests in `App.test.tsx` and entry-state unit tests in `guestFlow.test.ts`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library

---

## File Map

- Modify: `apps/frontend/src/types.ts`
  Purpose: add a guest-flow entry type that can represent a prefilled multi-event-type wizard.
- Modify: `apps/frontend/src/lib/guestFlow.ts`
  Purpose: derive the entry state from `eventTypes` plus an optional prefilled event type, and keep progress steps at `1/2/3` for every multi-type flow.
- Modify: `apps/frontend/src/lib/guestFlow.test.ts`
  Purpose: lock down the new entry-state and stepper rules.
- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
  Purpose: pass the currently selected event type into `onStartBooking`.
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx`
  Purpose: start at `2/3` for a valid prefilled type, always render `Назад`, and delegate the first-step exit to an explicit callback.
- Modify: `apps/frontend/src/App.tsx`
  Purpose: store the selected public event type as wizard origin context and pass it into `GuestBookingPage`.
- Modify: `apps/frontend/src/App.test.tsx`
  Purpose: cover open-on-step-2, back-to-step-1, first-step exit to public home, slot preservation when event type stays the same, and slot reset when it changes.

### Task 1: Extend Guest Flow Entry State

**Files:**
- Modify: `apps/frontend/src/types.ts`
- Modify: `apps/frontend/src/lib/guestFlow.ts`
- Test: `apps/frontend/src/lib/guestFlow.test.ts`

- [x] **Step 1: Write the failing guest-flow unit tests**

Add the new test cases to `apps/frontend/src/lib/guestFlow.test.ts`:

```ts
describe("deriveEntryState", () => {
  it("returns prefilled-public-booking for a valid selected event type in a multi-type flow", () => {
    const state = deriveEntryState(multiEventTypes, "standard");

    expect(state.kind).toBe("prefilled-public-booking");
    if (state.kind === "prefilled-public-booking") {
      expect(state.presetEventType).toEqual(multiEventTypes[0]);
    }
  });

  it("falls back to choose-event-type when the selected event type is missing", () => {
    expect(deriveEntryState(multiEventTypes, "missing").kind).toBe("choose-event-type");
  });
});

describe("buildProgressSteps", () => {
  it("keeps the event type step for a prefilled public booking entry", () => {
    expect(buildProgressSteps("prefilled-public-booking")).toEqual([
      "Тип встречи",
      "Дата и время",
      "Контакты",
    ]);
  });
});
```

- [x] **Step 2: Run the focused unit tests to verify they fail**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/lib/guestFlow.test.ts
```

Expected: FAIL because `deriveEntryState()` does not accept a prefilled event type yet, the new `prefilled-public-booking` kind does not exist, and `buildProgressSteps()` cannot handle it.

- [x] **Step 3: Add the new entry-state type and update guest-flow helpers**

In `apps/frontend/src/types.ts`, extend the entry-state union:

```ts
export type EntryStateKind =
  | "unavailable"
  | "direct-booking"
  | "choose-event-type"
  | "prefilled-public-booking";

export type PrefilledPublicBookingEntryState = {
  kind: "prefilled-public-booking";
  presetEventType: EventType;
};

export type EntryState =
  | UnavailableEntryState
  | DirectBookingEntryState
  | ChooseEventTypeEntryState
  | PrefilledPublicBookingEntryState;
```

In `apps/frontend/src/lib/guestFlow.ts`, update the function signatures and branching:

```ts
export function deriveEntryState(
  eventTypes: EventType[],
  prefilledEventTypeId?: string,
): EntryState {
  if (eventTypes.length === 0) {
    return { kind: "unavailable" };
  }

  if (eventTypes.length === 1) {
    return {
      kind: "direct-booking",
      presetEventType: eventTypes[0],
    };
  }

  const presetEventType = eventTypes.find((eventType) => eventType.id === prefilledEventTypeId);

  if (presetEventType) {
    return {
      kind: "prefilled-public-booking",
      presetEventType,
    };
  }

  return { kind: "choose-event-type" };
}

export function buildProgressSteps(kind: EntryStateKind): string[] {
  if (kind === "direct-booking") {
    return ["Дата и время", "Контакты"];
  }

  if (kind === "choose-event-type" || kind === "prefilled-public-booking") {
    return ["Тип встречи", "Дата и время", "Контакты"];
  }

  return [];
}
```

- [x] **Step 4: Run the focused unit tests to verify they pass**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/lib/guestFlow.test.ts
```

Expected: PASS for the new prefilled entry-state coverage and the existing direct-booking coverage.

- [ ] **Step 5: Commit the guest-flow groundwork**

Run:

```bash
git add apps/frontend/src/types.ts apps/frontend/src/lib/guestFlow.ts apps/frontend/src/lib/guestFlow.test.ts
git commit -m "feat: add prefilled guest booking entry state"
```

### Task 2: Wire Public Origin And Wizard Back Navigation

**Files:**
- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Test: `apps/frontend/src/App.test.tsx`

- [x] **Step 1: Write the failing integration tests for public-origin booking**

Add these tests to `apps/frontend/src/App.test.tsx` near the existing booking flow coverage:

```ts
it("opens the booking flow on date and time when a public event type filter is already selected", async () => {
  const user = userEvent.setup();

  render(<App scenario="public" />);

  await user.click(screen.getByRole("button", { name: "Стратегическая сессия, 30 мин" }));
  await user.click(screen.getByRole("button", { name: "Записаться" }));

  expect(screen.getByRole("heading", { name: "Выберите дату и время" })).toBeInTheDocument();

  const progressItems = within(
    screen.getByRole("list", { name: "Прогресс бронирования" }),
  ).getAllByRole("listitem");

  expect(progressItems[0]).toHaveClass("progress-step--done");
  expect(progressItems[1]).toHaveClass("progress-step--active");
  expect(screen.getByText("Стратегическая сессия")).toBeInTheDocument();
});

it("returns from the prefilled date step to event type selection and then back to public bookings", async () => {
  const user = userEvent.setup();

  render(<App scenario="public" />);

  await user.click(screen.getByRole("button", { name: "Стратегическая сессия, 30 мин" }));
  await user.click(screen.getByRole("button", { name: "Записаться" }));
  await user.click(screen.getByRole("button", { name: "Назад" }));

  expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Стратегическая сессия" })).toHaveClass(
    "choice-card--selected",
  );

  await user.click(screen.getByRole("button", { name: "Назад" }));

  expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Стратегическая сессия, 30 мин" })).toHaveClass(
    "filter-chip--active",
  );
});
```

- [x] **Step 2: Run the narrowed integration slice to verify it fails**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t "opens the booking flow on date and time when a public event type filter is already selected|returns from the prefilled date step to event type selection and then back to public bookings"
```

Expected: FAIL because the public home does not pass the selected event type to `App`, `GuestBookingPage` does not recognize a prefilled multi-type entry, and step `1/3` cannot exit back to the public home.

- [x] **Step 3: Pass public booking context from the home screen into App**

In `apps/frontend/src/components/PublicBookingsHome.tsx`, change the callback contract:

```ts
type PublicBookingsHomeProps = {
  // ...
  onStartBooking: (entry: { isoDate: string; eventTypeId?: string }) => void;
};
```

Update the CTA click handler to include the currently selected filter when it is not `ALL_EVENT_TYPES_FILTER`:

```ts
onClick={() =>
  selectedDay &&
  onStartBooking({
    isoDate: selectedDay.isoDate,
    eventTypeId:
      selectedFilterId === ALL_EVENT_TYPES_FILTER ? undefined : selectedFilterId,
  })
}
```

In `apps/frontend/src/App.tsx`, add state for the public booking origin:

```ts
const [selectedBookingEventTypeId, setSelectedBookingEventTypeId] = useState("");
```

Wire it in the home screen callback and in the booking screen props:

```ts
onStartBooking={({ isoDate, eventTypeId }) => {
  setSelectedHomeDate(isoDate);
  setSelectedBookingEventTypeId(eventTypeId ?? "");
  setSuccessDestination("home");
  setScreen("booking");
}}
```

```tsx
<GuestBookingPage
  eventTypes={guestEventTypes}
  datesByEventType={datesByEventType}
  initialSelectedDate={selectedHomeDate}
  initialSelectedEventTypeId={selectedBookingEventTypeId || undefined}
  onExit={() => {
    setScreen("home");
  }}
  // existing props stay in place
/>
```

- [x] **Step 4: Make GuestBookingPage respect prefilled multi-type entry and always show back**

In `apps/frontend/src/components/GuestBookingPage.tsx`, extend the props and entry-state derivation:

```ts
type GuestBookingPageProps = {
  eventTypes: EventType[];
  datesByEventType: AvailableDatesByEventType;
  initialSelectedDate?: string;
  initialSelectedEventTypeId?: string;
  successActionLabel?: string;
  onBookingSubmit?: (draft: BookingDraft) => Promise<void>;
  onSuccessAction?: () => void;
  onExit?: () => void;
};
```

```ts
const entryState = deriveEntryState(eventTypes, initialSelectedEventTypeId);
const startsInsideThreeStepFlow =
  entryState.kind === "choose-event-type" || entryState.kind === "prefilled-public-booking";
const startsOnDateTime =
  entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking";

const [currentScreen, setCurrentScreen] = useState<"event-type" | "date-time" | "contacts" | "success">(
  startsOnDateTime ? "date-time" : "event-type",
);
const [selectedEventTypeId, setSelectedEventTypeId] = useState(
  entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking"
    ? entryState.presetEventType.id
    : "",
);
```

Update the direct-entry effect so it preserves the prefilled public path instead of forcing all prefilled entries into the two-step model:

```ts
useEffect(() => {
  if (entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking") {
    if (selectedEventTypeId !== entryState.presetEventType.id) {
      setSelectedEventTypeId(entryState.presetEventType.id);
    }
    if (currentScreen === "event-type" && entryState.kind === "direct-booking") {
      setCurrentScreen("date-time");
    }
    return;
  }

  const eventTypeExists = eventTypes.some((eventType) => eventType.id === selectedEventTypeId);

  if (!eventTypeExists && selectedEventTypeId) {
    setSelectedEventTypeId("");
  }
  if (!eventTypeExists && currentScreen !== "event-type") {
    setCurrentScreen("event-type");
  }
}, [currentScreen, entryState, eventTypes, selectedEventTypeId]);
```

Replace the back-button conditions and handler:

```ts
const activeIndex =
  currentScreen === "event-type"
    ? 0
    : currentScreen === "date-time"
      ? startsInsideThreeStepFlow
        ? 1
        : 0
      : startsInsideThreeStepFlow
        ? 2
        : 1;

const canGoBack = currentScreen !== "success";

const handleBack = () => {
  if (currentScreen === "contacts") {
    setCurrentScreen("date-time");
    return;
  }

  if (currentScreen === "date-time" && startsInsideThreeStepFlow) {
    setCurrentScreen("event-type");
    return;
  }

  if (currentScreen === "event-type") {
    onExit?.();
  }
};
```

Keep the existing event-type change logic that clears `selectedTime`; that already satisfies the “change type, clear slot” requirement.

- [x] **Step 5: Run the narrowed integration slice to verify it passes**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t "opens the booking flow on date and time when a public event type filter is already selected|returns from the prefilled date step to event type selection and then back to public bookings"
```

Expected: PASS with the wizard opening at step `2/3`, `Назад` returning to `1/3`, and first-step `Назад` exiting to the public home.

- [ ] **Step 6: Commit the public-origin wiring**

Run:

```bash
git add apps/frontend/src/components/PublicBookingsHome.tsx apps/frontend/src/components/GuestBookingPage.tsx apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx
git commit -m "feat: add booking wizard back navigation"
```

### Task 3: Lock Down Preservation And Reset Rules

**Files:**
- Modify: `apps/frontend/src/App.test.tsx`
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx` (only if test failures expose reconciliation gaps)

- [x] **Step 1: Add failing tests for preserved slot state and reset-on-type-change in the prefilled flow**

Add these tests to `apps/frontend/src/App.test.tsx`:

```ts
it("preserves the selected slot when returning to event types and keeping the same type", async () => {
  const user = userEvent.setup();

  render(<App scenario="public" />);

  await user.click(screen.getByRole("button", { name: "Стратегическая сессия, 30 мин" }));
  await user.click(screen.getByRole("button", { name: "Записаться" }));
  await user.click(screen.getByRole("button", { name: "09:00" }));
  await user.click(screen.getByRole("button", { name: "Назад" }));
  await user.click(screen.getByRole("button", { name: "Далее" }));

  expect(screen.getByRole("button", { name: "09:00" })).toHaveClass("choice-card--selected");
  expect(screen.getByRole("button", { name: "Далее" })).toBeEnabled();
});

it("clears the selected slot after changing the prefilled event type", async () => {
  const user = userEvent.setup();

  render(<App scenario="public" />);

  await user.click(screen.getByRole("button", { name: "Стратегическая сессия, 30 мин" }));
  await user.click(screen.getByRole("button", { name: "Записаться" }));
  await user.click(screen.getByRole("button", { name: "09:00" }));
  await user.click(screen.getByRole("button", { name: "Назад" }));
  await user.click(screen.getByRole("button", { name: "Поговорить" }));
  await user.click(screen.getByRole("button", { name: "Далее" }));

  expect(screen.getByText("Поговорить")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  expect(
    within(screen.getByLabelText("Результат предыдущих шагов")).queryByText(
      /09:00/,
    ),
  ).not.toBeInTheDocument();
});
```

- [x] **Step 2: Run the preservation/reset slice to verify it fails if reconciliation is incomplete**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t "preserves the selected slot when returning to event types and keeping the same type|clears the selected slot after changing the prefilled event type"
```

Expected: PASS immediately if the existing `selectedDate`/`selectedTime` reconciliation already covers the new flow; otherwise FAIL with a mismatch that points to `GuestBookingPage`.

- [x] **Step 3: Patch GuestBookingPage only if the tests expose a real gap**

If the preservation test fails because returning from `event-type` resets the date or slot even when the type stays the same, narrow the `onSelect` reset logic in `apps/frontend/src/components/GuestBookingPage.tsx`:

```ts
onSelect={(eventTypeId) => {
  const eventTypeChanged = eventTypeId !== selectedEventTypeId;
  const nextDates = datesByEventType[eventTypeId] ?? [];
  const nextSelectedDate =
    !eventTypeChanged && nextDates.some((date) => date.isoDate === selectedDate)
      ? selectedDate
      : initialSelectedDate && nextDates.some((date) => date.isoDate === initialSelectedDate)
        ? initialSelectedDate
        : nextDates[0]?.isoDate ?? "";

  setSelectedEventTypeId(eventTypeId);
  setSelectedDate(nextSelectedDate);

  if (eventTypeChanged) {
    setSelectedTime("");
  }

  setSubmissionError("");
}}
```

Do not add this patch if the new tests already pass with the current logic.

- [x] **Step 4: Run the broader booking regression slice**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t "shows the selected event type above the date and time step|clears date and time selection after changing the event type|opens the booking flow from the public home with the selected date preserved|opens the booking flow on date and time when a public event type filter is already selected|returns from the prefilled date step to event type selection and then back to public bookings|preserves the selected slot when returning to event types and keeping the same type|clears the selected slot after changing the prefilled event type|returns from the success screen back to public bookings and shows the new booking"
```

Expected: PASS for the old guest-flow behavior plus the new prefilled public-entry behavior.

- [ ] **Step 5: Commit the final regression coverage**

Run:

```bash
git add apps/frontend/src/App.test.tsx apps/frontend/src/components/GuestBookingPage.tsx
git commit -m "test: cover booking wizard back flow"
```

## Self-Review

Spec coverage check:
- Entry on step `2/3` with prefilled public event type: covered by Task 1 and Task 2.
- Keep stepper as `1/2/3`: covered by Task 1 and asserted in Task 2.
- `Назад` on every step and exit through step `1/3`: covered by Task 2.
- Preserve date/slot when type does not change: covered by Task 3.
- Clear slot when type changes: covered by Task 3.
- Preserve contacts on `3 -> 2`: no code change is planned because current `GuestBookingPage` state already keeps `name` and `email` in component state while navigating; include a follow-up assertion during implementation if regression risk appears.
- Invalid prefilled event type stays in origin: covered by Task 1 fallback (`choose-event-type`) plus Task 2 wiring, because App passes only current public filters and `deriveEntryState()` rejects missing ids.

Placeholder scan:
- No `TODO`, `TBD`, or “implement later” markers remain.
- Every code-changing step names exact files and includes concrete code snippets.

Type consistency check:
- `prefilled-public-booking`, `initialSelectedEventTypeId`, and `onExit` are used consistently across `types.ts`, `guestFlow.ts`, `GuestBookingPage.tsx`, and `App.tsx`.

