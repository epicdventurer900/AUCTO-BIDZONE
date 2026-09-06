---
name: fullstack-feature-dev
description: 'Implement new features across the entire stack (database → backend API → frontend UI). Use when adding rooms, auctions, bids, chat, notifications, or other auction platform functionality. Includes database migrations, SQLAlchemy models, FastAPI endpoints, schemas, services, and React components.'
argument-hint: 'Feature name and high-level requirements (e.g., "Add team management with role-based access")'
---

# Full-Stack Feature Development

## When to Use

- Adding new features to the auction platform (rooms, bids, auctions, notifications, chat, etc.)
- Implementing database tables with backend API exposure
- Building connected frontend pages that interact with new endpoints
- Working with real-time features (WebSocket integration)
- Any work spanning database → API → frontend

## Architecture Overview

```
Database (SQLAlchemy ORM)
    ↓
Backend Services (business logic)
    ↓
API Schemas & Endpoints (FastAPI)
    ↓
Frontend Pages & Components (React/TypeScript)
```

**Tech Stack**:
- **Backend**: FastAPI, SQLAlchemy, Alembic (migrations), Pydantic (schemas)
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Real-time**: WebSocket manager in `app.websocket.manager`
- **Auth**: JWT tokens, stored in `localStorage` and passed in headers

## Step-by-Step Procedure

### Phase 1: Database & Models

#### 1.1 Create Database Migration (if new table)
- Navigate to `backend/alembic/versions/`
- Run: `alembic revision --autogenerate -m "Add <feature> table"`
- Review generated migration file; edit manually if needed
- Apply: `alembic upgrade head`

#### 1.2 Create SQLAlchemy Model
- Add model file in `backend/app/models/` (e.g., `backend/app/models/my_feature.py`)
- Define table with `__tablename__`, columns, relationships
- Import in `backend/app/models/__init__.py`
- **Reference**: [user.py](../../models/user.py), [room.py](../../models/room.py)

#### 1.3 Create Database Schema (Pydantic)
- Add schema in `backend/app/schemas/` (e.g., `backend/app/schemas/my_feature.py`)
- Define request/response schemas (Read, Create, Update)
- Use type hints; leverage `Optional`, `List` for flexibility
- **Reference**: [user.py](../../schemas/user.py), [room.py](../../schemas/room.py)

### Phase 2: Backend Services & API

#### 2.1 Create Service Layer
- Add service file in `backend/app/services/` (e.g., `backend/app/services/my_feature_service.py`)
- Implement business logic: CRUD operations, validations, transactions
- Keep database queries isolated here
- Dependency inject `db: Session` from `app.api.deps`
- **Reference**: [room_service.py](../../services/room_service.py)

#### 2.2 Create API Endpoint(s)
- Add route handler in `backend/app/api/v1/` (e.g., `backend/app/api/v1/my_feature.py`)
- Implement: GET (list, fetch by ID), POST (create), PUT (update), DELETE
- Use path/query parameters, JSON body, proper HTTP status codes
- Inject dependencies: `db: Session = Depends(get_db)`, `current_user = Depends(get_current_user)`
- Add to router in `backend/app/api/v1/router.py`
- **Reference**: [rooms.py](../../api/v1/rooms.py), [users.py](../../api/v1/users.py)

#### 2.3 WebSocket Integration (if real-time needed)
- Add manager method to `backend/app/websocket/manager.py`
- Broadcast updates via `manager.broadcast()` or targeted notifications
- Test with frontend WebSocket hook
- **Reference**: [manager.py](../../websocket/manager.py)

### Phase 3: Frontend Integration

#### 3.1 Create API Client Function
- Add function in `backend/src/api/client.ts`
- Use `fetch()` with auth header: `"Authorization": "Bearer ${token}"`
- Handle errors, parse JSON responses
- Export for use in components
- **Reference**: [client.ts](../../src/api/client.ts)

#### 3.2 Create React Component/Page
- Add component in `backend/src/pages/` (new page) or `backend/src/components/` (reusable)
- Use `useEffect()` to fetch data, `useState()` for local state
- Leverage `useAuth()` context for user/token
- Handle loading, error, empty states
- **Reference**: [RoomPage.tsx](../../src/pages/RoomPage.tsx), [DashboardPage.tsx](../../src/pages/DashboardPage.tsx)

#### 3.3 Add Real-time Hooks (if WebSocket)
- Use existing `useRoomSocket()` hook or create new in `backend/src/hooks/`
- Listen for broadcasts, update UI reactively
- Clean up listeners on unmount
- **Reference**: [useRoomSocket.ts](../../src/hooks/useRoomSocket.ts)

#### 3.4 Add Route
- Update `backend/src/App.tsx`: add new `<Route>` with path and component
- Wrap in `<PrivateRoute>` if authentication required
- **Reference**: [App.tsx](../../src/App.tsx)

### Phase 4: Testing & Validation

#### 4.1 Backend
- Test endpoints manually (Postman, VS Code REST Client, or browser)
- Verify database state with migrations
- Check error handling (400, 401, 404, 500 responses)

#### 4.2 Frontend
- Run dev server: `npm run dev` (in `frontend/`)
- Test page navigation and data display
- Verify API calls in browser DevTools (Network tab)
- Test error states and loading UI

#### 4.3 Integration
- Test full user flow: login → navigate → interact with feature → real-time updates
- Check WebSocket connections (if applicable)
- Verify auth is working (tokens sent, rejected on invalid)

## Quick Reference

### Common Commands

```bash
# Backend
cd backend
.venv_backend\Scripts\python -m uvicorn app.main:app --reload

# Database migration
alembic revision --autogenerate -m "Migration message"
alembic upgrade head

# Frontend
cd frontend
npm run dev
npm run build
npm run preview
```

### File Locations Quick Guide

| Purpose | Path | Notes |
|---------|------|-------|
| Database table | `models/` | One file per table, import in `__init__.py` |
| Request/response schema | `schemas/` | Pydantic, for serialization |
| Business logic | `services/` | Stateless functions, depend on `db: Session` |
| API endpoint | `api/v1/` | FastAPI route handlers |
| Router setup | `api/v1/router.py` | Import all route files and include in main router |
| WebSocket | `websocket/manager.py` | Singleton manager for broadcasts |
| Frontend page | `src/pages/` | Full-screen routes |
| Frontend component | `src/components/` | Reusable UI fragments |
| API client | `src/api/client.ts` | Fetch wrappers, auth headers |
| React context | `src/context/` | Global state (auth, etc.) |
| Custom hooks | `src/hooks/` | Reusable logic (fetch, WebSocket) |
| Routes | `src/App.tsx` | Route definitions |

### Auth Pattern

**Backend**:
```python
from app.api.deps import get_current_user
@router.get("/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}"}
```

**Frontend**:
```typescript
const { token } = useAuth();
const response = await fetch("/api/v1/endpoint", {
  headers: { "Authorization": `Bearer ${token}` }
});
```

### Common Patterns

**Paginate results** (backend):
```python
@router.get("/items")
async def list_items(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    items = db.query(Item).offset(skip).limit(limit).all()
    return items
```

**Handle optional fields** (schema):
```python
from typing import Optional
class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
```

**Real-time broadcasts** (WebSocket):
```python
await manager.broadcast({
    "type": "item_created",
    "data": item.dict()
})
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized on frontend | Check token in localStorage; verify `Authorization` header format is `Bearer <token>` |
| Migration fails | Ensure model is imported in `models/__init__.py`; check for SQL syntax errors in migration file |
| CORS error | Verify `CORS_ORIGINS` in `.env` includes frontend URL (e.g., `http://localhost:5173`) |
| WebSocket not connecting | Check browser console for errors; ensure `/ws` endpoint is exposed in FastAPI |
| Frontend can't find API | Verify API base URL in `client.ts` matches backend URL (e.g., `http://localhost:8000/api/v1`) |

## Example Workflow: Add "Follow User" Feature

1. **Model**: Add `followers` relationship in `User` model
2. **Service**: Create `follow_user()` and `get_followers()` in `user_service.py`
3. **API**: Add POST `/users/{id}/follow` and GET `/users/{id}/followers`
4. **Frontend**: 
   - Create `FollowButton` component with `onClick` handler
   - Add button to user profile page
   - Fetch followers list and display in `FollowersList` component
   - Use `useAuth()` to check if current user follows

## Next Steps After Completing Feature

- Write unit tests for service layer
- Document API endpoints (add docstrings, request/response examples)
- Add form validation on frontend
- Implement optimistic UI updates (update UI immediately, then sync with backend)
- Add loading spinners and error toasts
- Consider caching strategies for frequently-fetched data
