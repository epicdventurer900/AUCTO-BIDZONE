# AUCTO-BIDZONE

> A fast, real-time auction platform for running live bidding rooms with confidence.

AUCTO-BIDZONE is a full-stack auction platform built for live, collaborative auctions. Organizers can create rooms, add items, control the auction timer, and monitor bidding in real time. Participants can join with a room code, bid securely, chat with the room, and follow the auction state from any modern browser.

## Why AUCTO-BIDZONE?

Traditional auctions are often difficult to coordinate when bidders, auctioneers, and viewers are in different places. AUCTO-BIDZONE brings the complete experience into one focused workspace:

- **Live bidding** with real-time state synchronization
- **Role-based rooms** for auctioneers, bidders, and viewers
- **Transparent activity** through chat, notifications, and audit logs
- **A clean workflow** from room creation to auction report
- **A scalable foundation** for commercial auctions, sports-style player auctions, procurement, collectibles, vehicles, and more

## Features

### Live auction rooms

- Create and join rooms with shareable room codes
- Configure bid increments, timers, team purses, and room descriptions
- Add auction items with names, base prices, and categories
- Start, pause, resume, advance, and end an auction

### Real-time bidding

- Place bids through the REST API or WebSocket connection
- Synchronize auction state instantly across connected clients
- Track the current item, highest bid, timer phase, and winning team
- Prevent invalid bids and enforce auctioneer permissions on the server

### Collaboration and accountability

- Room chat for auction participants
- Notifications and read/unread status
- Audit logs for important room activity
- Auction reports after the room is complete

### Secure access

- User registration and login
- JWT-based authentication
- Protected frontend routes
- Role-aware room operations
- Password hashing and server-side validation

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Backend | FastAPI, Python, SQLAlchemy, Pydantic |
| Database | PostgreSQL |
| Real-time | FastAPI WebSockets |
| Authentication | JWT, Passlib, bcrypt |
| Migrations | Alembic |

## Project structure

```text
aucto-bidzone/
├── backend/
│   ├── app/
│   │   ├── api/              # REST and WebSocket routes
│   │   ├── auction_engine/   # Auction rules and bid processing
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Request and response schemas
│   │   ├── services/         # Application services
│   │   └── websocket/        # Connection management
│   ├── alembic/              # Database migrations
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/              # API client and types
    │   ├── context/           # Authentication state
    │   ├── hooks/             # Reusable React hooks
    │   └── pages/             # Login, dashboard, and room screens
    └── package.json
```

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/<your-account>/AUCTO-BIDZONE.git
cd AUCTO-BIDZONE
```

### 2. Configure the backend

From the `backend` directory, create a `.env` file. A ready-to-copy template is provided at `backend/.env.example`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:your-password@localhost:5432/aucto_bidzone
SECRET_KEY=replace-with-a-long-random-secret-at-least-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
```

Create the PostgreSQL database, then install backend dependencies and start the API on **port 8001** (so it can run alongside another local service using port 8000):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

The API will be available at:

- API: `http://localhost:8001`
- Interactive API docs: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/health`

### 3. Start the frontend

Open a **second terminal from the project root**:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

The local Vite configuration proxies `/api` and `/api/v1` to the backend on port 8001, and the WebSocket fallback also uses port 8001. No separate `SOCKET_PORT` is required locally.

For a deployed backend, configure the frontend environment as needed:

```env
VITE_API_URL=https://your-api.example.com/api/v1
VITE_WS_URL=wss://your-api.example.com
```

## Common issues & troubleshooting

### 1. Dependency / installation problems

AUCTO-BIDZONE uses **pip for the Python backend** and **npm for the React frontend**. Do not run `npm install` inside `backend`.

Backend:

```powershell
cd backend
python -m pip install -r requirements.txt
python --version
```

Frontend:

```powershell
cd frontend
npm install
node -v
npm run dev
```

If dependencies are inconsistent, remove `frontend/node_modules` and `frontend/package-lock.json`, then run `npm install` again. Do this only if a normal `npm install` does not fix the problem.

### 2. Environment variable errors

The backend requires `DATABASE_URL` and `SECRET_KEY`. The project uses **`SECRET_KEY`**, not `JWT_SECRET`, and the secret must be at least 32 characters long.

Copy `backend/.env.example` to `backend/.env` and replace the placeholder values with your local PostgreSQL details and a private secret.

Do **not** commit the real `.env` file to GitHub.

### 3. Database connection errors

AUCTO-BIDZONE uses **PostgreSQL**, not MongoDB or MySQL.

Check that PostgreSQL is running and that the database named in `DATABASE_URL` exists. For example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:your-password@localhost:5432/aucto_bidzone
```

Then apply migrations from `backend`:

```powershell
alembic upgrade head
```

### 4. WebSocket / CORS errors

For local development the normal setup is:

- Frontend: `http://localhost:5173`
- REST API: `http://localhost:8001`
- WebSocket: `ws://localhost:8001`

There is **no separate `SOCKET_PORT`** in the local setup. REST and WebSocket traffic are served by the same FastAPI process.

Make sure `CORS_ORIGINS` contains the frontend URL:

```env
CORS_ORIGINS=http://localhost:5173
```

If another application is already using port 8000, that is fine; AUCTO-BIDZONE is configured for 8001 locally.

### 5. PowerShell `cd` errors

If your terminal already shows:

```text
...\auction soft\backend>
```

do **not** run `cd backend` again. Start the backend directly:

```powershell
python -m uvicorn app.main:app --reload --port 8001
```

For the frontend, open a new terminal and start from the project root:

```powershell
cd "C:\Users\prayu\OneDrive\Desktop\auction soft"
cd frontend
npm install
npm run dev
```

## Useful commands

### Frontend

```bash
npm run dev       # Start the development server
npm run build     # Type-check and create a production build
npm run lint      # Run Oxlint
npm run preview   # Preview the production build
```

### Backend

```bash
uvicorn app.main:app --reload --port 8001
alembic upgrade head
```

## Typical user flow

1. Register or log in.
2. Create an auction room.
3. Add teams and auction items.
4. Share the room code with participants.
5. Start the auction and manage the live timer.
6. Participants place bids in real time.
7. Review the final auction report and activity history.

## Production roadmap

The current codebase provides a strong MVP foundation. Recommended next steps for a production SaaS release include:

- Payment collection, deposits, refunds, and invoices
- Email, SMS, and WhatsApp notifications
- Image and document uploads for auction items
- Admin analytics and organizer dashboards
- Rate limiting, monitoring, backups, and structured logging
- Automated tests and CI/CD deployment
- Multi-tenant organizations and subscription plans
- Mobile-first improvements or native mobile applications

## Security notes

- Never commit `.env` files, passwords, or production credentials.
- Use a unique, high-entropy `SECRET_KEY` in production.
- Restrict `CORS_ORIGINS` to trusted frontend domains before deployment.
- Run the API behind HTTPS and use `wss://` for production WebSockets.
- Review authorization rules before opening the platform to public auctions.

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the project owner.

## Project status

**MVP in active development.** AUCTO-BIDZONE is ready for continued product development, pilot auctions, and customization for a focused market.
