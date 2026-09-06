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
    │   ├── context/          # Authentication state
    │   ├── hooks/            # Reusable React hooks
    │   └── pages/            # Login, dashboard, and room screens
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

From the `backend` directory, create a `.env` file:

```env
DATABASE_URL=postgresql+psycopg2://postgres:your-password@localhost:5432/aucto_bidzone
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
```

Create the database, then install dependencies and start the API:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at:

- API: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

For a deployed backend, configure the frontend environment as needed:

```env
VITE_API_URL=https://your-api.example.com/api/v1
VITE_WS_URL=wss://your-api.example.com
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
uvicorn app.main:app --reload
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
