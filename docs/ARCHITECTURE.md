# AUCTO-BIDZONE Architecture

## Overview

AUCTO-BIDZONE is a full-stack real-time auction platform. The application is split into a React frontend, a FastAPI backend, PostgreSQL persistence, and WebSocket-based live updates.

```text
┌───────────────────────────────┐
│        React + TypeScript     │
│   Dashboard / Auction Room    │
└───────────────┬───────────────┘
                │ REST API
                │ WebSocket
┌───────────────▼───────────────┐
│          FastAPI API          │
│ Auth • Rooms • Users • Audit  │
│ Notifications • Auction API  │
└───────────────┬───────────────┘
                │ SQLAlchemy
┌───────────────▼───────────────┐
│          PostgreSQL           │
│ Users • Rooms • Items • Bids  │
│ Teams • Events • Audit Logs   │
└───────────────────────────────┘
```

## Backend responsibilities

- **API layer:** exposes versioned REST endpoints and WebSocket routes.
- **Authentication:** validates users and protects room operations with JWT-based access control.
- **Auction engine:** owns bidding rules, timer state, item progression, and winner decisions.
- **Services:** keeps application workflows separate from HTTP route handlers.
- **Models and schemas:** define database persistence and validated API contracts.
- **Alembic:** manages database schema migrations.

## Real-time flow

1. A participant joins an auction room.
2. The frontend establishes a WebSocket connection.
3. A bidder submits a bid through the supported API flow.
4. The backend validates the bid against the current auction state.
5. The auction state is persisted and broadcast to connected clients.
6. Every client updates its room UI without requiring a page refresh.

## Security boundaries

- Authentication and authorization are enforced server-side.
- Passwords must never be stored as plaintext.
- Secrets and database credentials belong in environment variables, not source control.
- Production deployments should use HTTPS and secure WebSocket connections (`wss://`).
- Room actions should be checked against the authenticated user's role before state changes are accepted.

## Data design

The database is the source of truth for persistent auction data. The application should treat WebSocket messages as real-time notifications of validated state changes rather than as a replacement for server-side authorization or persistence.

## Frontend responsibilities

The frontend provides the user-facing auction experience, including authentication, dashboards, room screens, bidding controls, notifications, and live state presentation. API access should remain centralized so backend changes do not require request logic to be duplicated throughout the UI.

## Development principle

New features should follow the existing separation of concerns:

**UI → API/WebSocket → service/auction logic → database**

Avoid putting business rules directly inside React components or route handlers when the logic can be shared and tested in the appropriate backend service.
