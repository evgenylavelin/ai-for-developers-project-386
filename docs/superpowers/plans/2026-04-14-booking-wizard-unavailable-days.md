# Booking Wizard Unavailable Days Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make zero-slot days in the booking wizard render with the same unavailable visual semantics as the public bookings calendar.

**Architecture:** Keep the existing API contract and frontend data model unchanged. Update the wizard date grid to derive unavailable state from `date.slots.length === 0`, map that state to explicit unavailable UI, and cover the behavior with focused component and app-level tests.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Add failing coverage for wizard unavailable days

**Files:**
- Modify: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
  it("marks zero-slot days as unavailable in the booking flow", () => {
    render(<GuestBookingPage eventTypes={singleEventType} datesByEventType={{ standard: bookingSchedule }} />);

    const unavailableDay = screen.getByRole("button", { name: "Сб 18" });

    expect(unavailableDay).toHaveClass("calendar-day--unavailable");
    expect(within(unavailableDay).getByText("Запись недоступна")).toBeInTheDocument();
    expect(within(unavailableDay).queryByText("0 сл.")).not.toBeInTheDocument();
  });

  it("keeps the unavailable day styling after selecting a zero-slot date", async () => {
    const user = userEvent.setup();

    render(<GuestBookingPage eventTypes={singleEventType} datesByEventType={{ standard: bookingSchedule }} />);

    const unavailableDay = screen.getByRole("button", { name: "Сб 18" });
    await user.click(unavailableDay);

    expect(unavailableDay).toHaveClass("calendar-day--selected");
    expect(unavailableDay).toHaveClass("calendar-day--unavailable");
    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx -t "unavailable in the booking flow|unavailable day styling"`
Expected: FAIL because `DateTimeStep` still renders `0 сл.` and does not apply `calendar-day--unavailable`.

### Task 2: Implement unavailable-day rendering in the wizard

**Files:**
- Modify: `apps/frontend/src/components/DateTimeStep.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Update `DateTimeStep` day rendering**

```tsx
          {dates.map((date) => {
            const active = date.isoDate === activeDate.isoDate;
            const unavailable = date.slots.length === 0;

            return (
              <button
                key={date.isoDate}
                type="button"
                className={[
                  "calendar-day",
                  active ? "calendar-day--selected" : "",
                  unavailable ? "calendar-day--unavailable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`${date.weekdayShort} ${date.dayNumber}`}
                onClick={() => onSelectDate(date.isoDate)}
              >
                <span className="calendar-day__weekday">{date.weekdayShort}</span>
                {unavailable ? (
                  <span className="calendar-day__status">Запись недоступна</span>
                ) : (
                  <span className="calendar-day__slots" aria-hidden="true">
                    {date.slots.length} сл.
                  </span>
                )}
                <span className="calendar-day__number">{date.dayNumber}</span>
              </button>
            );
          })}
```

- [ ] **Step 2: Add unavailable-day styles for wizard cells**

```css
.calendar-day--unavailable {
  border-color: rgba(21, 33, 20, 0.18);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(249, 255, 244, 0.94) 0,
      rgba(249, 255, 244, 0.94) 10px,
      rgba(218, 241, 210, 0.76) 10px,
      rgba(218, 241, 210, 0.76) 20px
    );
  box-shadow: inset 0 0 0 1px rgba(21, 33, 20, 0.05);
}

.calendar-day--unavailable.calendar-day--selected {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px rgba(47, 154, 72, 0.2);
}

.calendar-day--unavailable .calendar-day__weekday,
.calendar-day--unavailable .calendar-day__number,
.calendar-day--unavailable .calendar-day__status {
  color: var(--color-text-secondary);
}

.calendar-day__status {
  position: absolute;
  right: 12px;
  bottom: 10px;
  max-width: 88px;
  font-size: 11px;
  line-height: 1.2;
  text-align: right;
}
```

- [ ] **Step 3: Run tests to verify implementation passes**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx -t "unavailable in the booking flow|unavailable day styling"`
Expected: PASS

### Task 3: Run broader regression check

**Files:**
- No file changes

- [ ] **Step 1: Run focused booking-flow and public-bookings regression tests**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx apps/frontend/src/components/PublicBookingsHome.test.tsx`
Expected: PASS

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/DateTimeStep.tsx apps/frontend/src/styles.css apps/frontend/src/App.test.tsx docs/superpowers/plans/2026-04-14-booking-wizard-unavailable-days.md
git commit -m "feat: highlight unavailable days in booking wizard"
```
