# Booking Wizard Back Navigation Design

## Summary

Define the guest booking wizard navigation when a visitor starts booking from the public bookings screen after already choosing an event type.

This design keeps the existing three-step wizard, skips redundant event type selection on entry when possible, and introduces a consistent back action on every wizard step.

## Scope

This design covers:

- wizard entry from the public bookings screen
- prefilled event type handling
- back navigation on steps `1/3`, `2/3`, and `3/3`
- preservation and reset rules for wizard state

This design does not cover:

- changes to authentication or roles
- new booking flows outside the existing guest booking wizard
- backend or contract changes unrelated to wizard navigation state

## Constraints

The design must preserve current product rules:

- no registration or authentication
- one fixed owner profile
- anonymous guest booking
- booking window remains limited to 14 days
- the same time slot cannot be booked twice, even across event types

## Problem

The current flow makes the guest re-enter event type selection even when the type was already chosen on the public bookings screen before pressing `Записаться`.

The current wizard also lacks a reliable backward path. The user can move forward with `Далее`, but cannot move back between steps or exit the wizard through the same navigation model.

## Goals

- avoid asking the user to reselect an already chosen event type
- keep the three-step mental model intact
- make `Назад` available on every step
- allow the user to change the prefilled event type if needed
- return the user to the exact calling context when leaving the wizard from step `1/3`

## Entry Model

The booking wizard receives two navigation inputs:

- `origin` — identifies the screen or context that opened the wizard
- `prefilledEventTypeId` — optional event type already selected before opening the wizard

If `prefilledEventTypeId` is not provided, the wizard opens in the default mode at step `1/3`.

If `prefilledEventTypeId` is provided and still available for public booking, the wizard opens directly at step `2/3`.

The wizard stepper does not collapse to a two-step flow. It continues to show the full three-step sequence, with step `2` marked as current and step `1` treated as already satisfied by the prior public-screen selection.

## Step Behavior

### Step `1/3`: Event Type

This step shows the event type list.

If the user arrived here after pressing `Назад` from step `2/3`, the previously selected event type remains selected.

`Далее` is enabled only when an event type is selected.

`Назад` closes the wizard and returns the user to `origin`.

### Step `2/3`: Date And Time

If the wizard was opened with a valid `prefilledEventTypeId`, this is the initial screen.

The screen must clearly show the currently selected event type so the user understands why step `1` was skipped on entry.

There is no separate `Изменить` action for the event type on this screen. The way to change it is `Назад`.

`Далее` is enabled only when the user selects a valid slot.

`Назад` returns the user to step `1/3`.

### Step `3/3`: Contacts

This step collects the guest contact details and presents the final booking confirmation action.

`Назад` returns the user to step `2/3`.

Returning from step `3/3` to `2/3` must preserve the entered contact data within the same wizard session.

## Back Navigation Rules

`Назад` is always visible in the wizard.

Its behavior is context-aware:

- on step `3/3`, it goes to step `2/3`
- on step `2/3`, it goes to step `1/3`
- on step `1/3`, it closes the wizard and returns to `origin`

The wizard must not rely on browser history for this behavior. The target of the first-step back action is the explicit stored `origin`, not an inferred previous page.

## State Preservation Rules

If the user returns from step `2/3` to step `1/3` and keeps the same event type, the previously selected date and slot remain available when moving forward to step `2/3` again.

If the user changes the event type on step `1/3`, all slot-dependent selections on step `2/3` are cleared and availability is recalculated for the new event type.

If the user returns from step `3/3` to step `2/3`, their contact data remains preserved in the current wizard session.

When the wizard closes through `Назад` on step `1/3`, the public bookings screen should restore the calling context where practical, including the selected event type and selected day if those values were already present there.

## Invalid Prefill Handling

If `prefilledEventTypeId` is provided but the event type is no longer available for public booking, the wizard must not open directly at step `2/3`.

Instead, the user remains in the calling context and sees a clear message that the selected event type is no longer available.

## UX Notes

This design intentionally keeps the stepper in the `1/2/3` format even when the wizard opens at step `2/3`.

The skipped-on-entry first step is not removed. It remains reachable through `Назад` so the user can review or change the event type without breaking the wizard structure.

This keeps the flow efficient for the common case while preserving transparency and editability.

## Acceptance Criteria

- a wizard opened from the public bookings screen with a valid selected event type starts at step `2/3`
- the wizard stepper still shows a three-step flow
- `Назад` is present on all wizard steps
- `Назад` on step `1/3` exits the wizard and returns the user to `origin`
- `Назад` on step `2/3` returns to event type selection
- `Назад` on step `3/3` returns to date and time selection
- keeping the same event type preserves the previously selected date and slot
- changing the event type clears slot-dependent choices and recalculates availability
- contact fields persist when moving from step `3/3` back to `2/3` and forward again in the same session
- an unavailable prefilled event type does not open the wizard at step `2/3`

