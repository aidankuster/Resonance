# Using Auth Session in Frontend

## Overview
The session endpoint has been integrated into the frontend React app. The app now automatically checks if a user is logged in via JWT cookies and manages authentication state globally.

## What was implemented:

### 1. API Service (`src/services/api.ts`)
- Added `credentials: 'include'` to all fetch requests to send cookies
- Added `checkSession()` method to verify if user has active JWT session
- Updated `logout()` to call the backend logout endpoint

### 2. Auth Hook (`src/hooks/useAuth.ts`)
- Custom hook that manages authentication state
- Automatically checks session on mount
- Provides `login`, `register`, `logout`, and `checkSession` methods

### 3. Auth Context (`src/contexts/AuthContext.tsx`)
- Global context provider for auth state
- Wraps entire app in `App.tsx`
- Accessible from any component via `useAuthContext()`

### 4. Protected Routes (`src/components/ProtectedRoute.tsx`)
- Component that redirects unauthenticated users to login
- Shows loading state while checking session
- Wraps protected pages (Dashboard, ProfileCreation, SearchResults)

### 5. Updated UserInitiation Page
- Uses auth context instead of direct API calls
- Redirects to dashboard if user is already logged in
- Shows loading state while checking session

## Usage Examples:

### In any component:
```tsx
import { useAuthContext } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, isLoading, logout } = useAuthContext();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome {user?.info?.displayName}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### User object structure:
```typescript
{
  id: number;
  emailAddress: string;
  enabled: boolean;
  admin: boolean;
  info?: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  tags?: string[];
}
```

## How it works:

1. **On App Load**: `AuthProvider` checks for active session via `/api/session`
2. **If Session Valid**: User object is stored, `isAuthenticated = true`
3. **If Session Invalid**: User is null, `isAuthenticated = false`
4. **On Login/Register**: Session cookie is set by backend, user state is updated
5. **On Logout**: Backend clears cookie, frontend clears state
6. **Protected Routes**: Check `isAuthenticated`, redirect to login if false

## Benefits:
- ✅ Automatic session validation on page load/refresh
- ✅ Users stay logged in via HTTP-only cookies (secure against XSS)
- ✅ Global auth state accessible anywhere in the app
- ✅ Automatic redirects for authenticated/unauthenticated users
- ✅ Loading states while checking session
