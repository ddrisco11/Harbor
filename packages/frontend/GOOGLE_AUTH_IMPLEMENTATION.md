# Google Authentication Implementation

This document explains the two approaches implemented for Google OAuth authentication.

## Approach 1: Client-side Flow (Recommended)

### Frontend Implementation
**File:** `packages/frontend/src/pages/LoginPage.tsx`

```javascript
const handleGoogleSignIn = async (e) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    // Fetch the auth URL from the backend
    const response = await fetch('/api/auth/google')
    const data = await response.json()
    
    // Redirect to Google's consent screen
    window.location.href = data.authUrl
  } catch (error) {
    console.error('Google sign-in error:', error)
    toast.error('Failed to initiate Google sign-in. Please try again.')
  }
}
```

### Backend Endpoint
**File:** `packages/backend/src/routes/auth.ts`

```javascript
// GET /api/auth/google - Returns JSON with authUrl
router.get('/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  
  res.json({ authUrl });
});
```

### Features:
- ✅ Error handling with user feedback
- ✅ Loading states and UX improvements
- ✅ Prevents default navigation behavior
- ✅ Full control over the authentication flow

## Approach 2: Server-side Redirect (Simple)

### Frontend Implementation
**File:** `packages/frontend/src/pages/LoginPageServerRedirect.tsx`

```html
<a href="/api/auth/google/redirect" className="btn-primary">
  Sign in with Google
</a>
```

### Backend Endpoint
**File:** `packages/backend/src/routes/auth.ts`

```javascript
// GET /api/auth/google/redirect - Direct redirect
router.get('/google/redirect', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  
  res.redirect(authUrl);
});
```

### Features:
- ✅ Minimal code required
- ✅ No JavaScript needed
- ✅ Works with simple HTML links
- ❌ Limited error handling
- ❌ No loading states

## OAuth Callback Handler

**File:** `packages/frontend/src/pages/OAuthCallbackPage.tsx`

Both approaches use the same callback handler that:
1. Extracts the authorization code from URL parameters
2. Sends the code to `/api/auth/google/callback`
3. Stores the returned JWT tokens
4. Redirects to the dashboard

## Configuration Requirements

### 1. Google Cloud Console
Update your OAuth2 redirect URI to:
```
http://localhost:3000/auth/callback
```

### 2. Environment Variables
Update `packages/backend/.env`:
```
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback"
```

### 3. Router Configuration
The callback route is handled in `packages/frontend/src/App.tsx`:
```javascript
// Handle OAuth callback route (should be accessible without authentication)
if (window.location.pathname === '/auth/callback') {
  return <OAuthCallbackPage />
}
```

## Testing

New test added for the redirect endpoint in `packages/backend/tests/unit/auth.test.ts`:

```javascript
describe('GET /api/auth/google/redirect', () => {
  it('should redirect to Google OAuth URL', async () => {
    const response = await request(app)
      .get('/api/auth/google/redirect')
      .expect(302);

    expect(response.headers.location).toContain('http://mock-auth-url');
  });
});
```

## Demo Page

**File:** `packages/frontend/src/pages/LoginPageDemo.tsx`

A demonstration page showing both approaches side-by-side for comparison and testing.

## Usage Recommendations

- **Use Approach 1 (Client-side)** for production applications that need proper error handling and user feedback
- **Use Approach 2 (Server-side)** for simple prototypes or when JavaScript is not available

Both approaches result in the same authentication flow and user experience once the OAuth process completes. 