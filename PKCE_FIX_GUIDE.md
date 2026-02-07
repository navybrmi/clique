# Google OAuth PKCE Error Fix

## Problem
Intermittent `InvalidCheck: pkceCodeVerifier value could not be parsed` error when signing in with Google OAuth.

This error indicates that the PKCE (Proof Key for Code Exchange) code verifier generated at the start of the authentication flow couldn't be found or validated when the OAuth callback was processed.

## Root Causes

The PKCE error typically occurs due to:

1. **Cookie Loss Between Requests**: PKCE code verifier is stored in cookies, but gets lost between the initial redirect and the callback
2. **Server Instance Mismatch**: In distributed deployments, different server instances may have different cookie stores
3. **Cache Issues**: Server-side caching preventing proper session/cookie retrieval
4. **Missing Cookie Configuration**: Unclear cookie settings leading to improper cookie handling
5. **Session Strategy Issues**: Improper session strategy configuration

## Solution

### 1. Enhanced Session Configuration
```typescript
session: {
  strategy: 'database',      // Explicit database strategy
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,   // 24 hours
}
```
- Explicitly set session strategy to 'database' for reliable storage
- Proper session expiry times prevent stale sessions

### 2. Explicit PKCE Cookie Configuration
```typescript
pkceCodeVerifier: {
  name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.pkce.code-verifier`,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  },
}
```
- **httpOnly**: Prevents client-side access to sensitive PKCE data
- **secure**: Only sent over HTTPS in production
- **sameSite: 'lax'**: Prevents CSRF while allowing legitimate cross-site requests
- **maxAge: 15 * 60**: Short expiry prevents stale PKCE verifiers accumulating

### 3. Improved Cookie Security
```typescript
sessionToken: {
  name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  },
}
```
- Secure flag ensures cookies only sent over HTTPS
- `__Secure-` prefix in production denotes high-security cookies
- Consistent SameSite policy across all auth cookies

### 4. Force Dynamic Rendering for Auth Routes
```typescript
// In /api/auth/[...nextauth]/route.ts
export const dynamic = 'force-dynamic'
```
- Prevents Next.js from caching auth route responses
- Ensures fresh cookie handling on every request
- Critical for OAuth state management

### 5. Google Provider Enhancement
```typescript
Google({
  clientId: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  allowDangerousEmailAccountLinking: false,
})
```

## Testing the Fix

1. **Local Development**
   ```bash
   npm run dev
   # Test Google OAuth signin multiple times
   ```

2. **Production Deployment**
   - Ensure `NEXTAUTH_URL` is correctly set to your production domain
   - Verify cookies are being set with `__Secure-` prefix
   - Monitor application logs for PKCE-related errors

3. **Cross-Device Testing**
   - Sign in from different browsers
   - Test on mobile and desktop
   - Verify sessions persist correctly

## Environment Variables Required

Ensure these are properly configured in your `.env` or deployment platform:

```env
# NextAuth Configuration
NEXTAUTH_URL="https://yourdomain.com"  # Must match your actual domain
AUTH_SECRET="your-secret-key"          # Strong random string
NEXTAUTH_SECRET="your-secret-key"      # Same as AUTH_SECRET

# Google OAuth
GOOGLE_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_SECRET="your-client-secret"

# Ensure Google OAuth Redirect URI is configured:
# https://yourdomain.com/api/auth/callback/google
```

## Deployment Considerations

### For Vercel/Serverless Environments
- Cookies are properly scoped to the domain
- Dynamic route configuration prevents caching issues
- Monitor function invocation logs for PKCE errors

### For Self-Hosted/Container Environments
- Ensure consistent session storage across instances
- Use database-backed sessions (already configured with PrismaAdapter)
- Verify cookie domain and path settings match your setup

### For Multi-Region Deployments
- Session storage in Prisma database ensures consistency
- Cookies with `SameSite: lax` and proper path configuration
- PKCE verifier short TTL (15 min) prevents stale state issues

## Troubleshooting

If you still see PKCE errors:

1. **Check Browser Cookies**
   - Look for `next-auth.pkce.code-verifier` cookie
   - Verify it persists between redirect and callback
   - Check SameSite and secure flags

2. **Enable Debug Logging**
   ```typescript
   // In development, NextAuth logs detailed info
   debug: process.env.NODE_ENV === 'development'
   ```

3. **Verify Redirect URI**
   - Ensure Google OAuth app has correct redirect URI
   - Format: `https://yourdomain.com/api/auth/callback/google`

4. **Check Network Tab**
   - Verify cookies are sent with callback request
   - Confirm same domain across all requests
   - Check for third-party cookie blocking issues

## References

- [NextAuth.js PKCE Documentation](https://authjs.dev/guides/providers/google)
- [OAuth PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [NextAuth.js Cookie Configuration](https://authjs.dev/reference/nextauth-js/config#cookies)
- [SameSite Cookie Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
