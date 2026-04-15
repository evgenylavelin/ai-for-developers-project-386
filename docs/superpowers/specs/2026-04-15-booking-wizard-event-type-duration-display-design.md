# Booking Wizard Event Type Duration Display Design

## Summary

Align the duration display in the guest booking wizard event type cards with the duration display already used on the public bookings page.

This change affects presentation only. It does not change wizard behavior, selection logic, API contracts, or data shapes.

## Scope

This design covers:

- the event type cards on the guest booking wizard step `Тип встречи`
- the visual structure used to show event duration inside those cards

This design does not cover:

- booking flow logic
- event type ordering or availability
- backend or contract changes
- changes to the public bookings page, which already has the target duration layout

## Problem

The event type cards inside the wizard currently show duration as plain inline text such as `23 минут`.

The public bookings page already uses a clearer two-line duration treatment, where a small `мин` label is shown separately from the duration value.

Because these two surfaces present the same event type metadata differently, the UI feels inconsistent.

## Goals

- make duration presentation consistent between the public bookings page and the wizard
- preserve the current wizard interaction model
- keep the change limited to the event type card presentation

## Visual Behavior

On the wizard step `Тип встречи`, each event type card should display duration using the same visual pattern as the public bookings page:

- a small duration unit label `мин`
- a separate duration value shown as the primary number

The duration block should remain part of the event type card and should not replace the event type title.

The card continues to show the event type title as its main text label.

## Interaction And State

This change does not alter interaction behavior.

The following must remain unchanged:

- selecting an event type by pressing its card
- selected and unselected card states
- keyboard and screen-reader access to event type selection
- step order and wizard navigation

## Accessibility

The card must continue to expose an accessible name that clearly identifies the event type and its duration.

The visual split between `мин` and the number must not reduce clarity for assistive technologies.

## Acceptance Criteria

- event type cards in the wizard no longer render duration as plain text in the form `N минут`
- event type cards in the wizard render duration using a separate `мин` label and a separate numeric value
- the visual duration pattern matches the existing public bookings page pattern closely enough to be perceived as the same treatment
- selecting an event type in the wizard behaves exactly as before
- no API, contract, or backend changes are introduced
