# Seat Reservation System

A Node.js seat reservation system built from the Melsoft Academy Seat Reservation System Logic Flow specification.

## Overview

The system manages a single event with 20 seats.

Each seat can be:

- Available
- Held
- Confirmed

Users can temporarily hold a seat, extend a hold, confirm a reservation, or release a seat.

When all seats are occupied, users can join a first-come-first-served waitlist.

Every important action is recorded in an event log.

## Technology

- Node.js
- Express.js
- HTML
- CSS
- JavaScript
- Node.js built-in test runner
- In-memory storage

## Reservation Rules

- 20 seats per event
- Holds expire after 60 seconds
- Maximum 2 active holds per user
- Maximum 5 holds per user per hour
- Maximum 2 extensions per hold
- Hold codes contain 6 uppercase letters/numbers
- Characters 0, O, 1, I and L are excluded
- Waitlist is first come, first served
- Repeated confirmation is safe and does not create another booking
- Expired or released hold codes cannot be used again
- All changes are recorded in the event log

## Installation

Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL