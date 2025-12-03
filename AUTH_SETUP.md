# Authentication Setup Guide

This app uses NextAuth.js v5 for authentication with Facebook, Apple ID, and Google OAuth providers.

## Quick Start for Development

For local development, you can use demo credentials or set up your own OAuth apps.

## Setting up Facebook OAuth

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Click "Create App"
3. Select "Consumer" as the app type
4. Fill in your app details
5. In the dashboard, go to **Settings** → **Basic**
6. Copy the **App ID** and **App Secret**
7. Under **Add Products**, add "Facebook Login"
8. Go to **Facebook Login** → **Settings**
9. Add to **Valid OAuth Redirect URIs**: `http://localhost:3000/api/auth/callback/facebook`
10. Add to your `.env`:
   ```
   FACEBOOK_ID="your-app-id-here"
   FACEBOOK_SECRET="your-app-secret-here"
   ```

## Setting up Apple ID OAuth

1. Go to [Apple Developer](https://developer.apple.com/account/resources/identifiers/list)
2. Create an **App ID** first (if you don't have one)
3. Create a **Services ID**:
   - Enter an identifier (e.g., `com.yourapp.signin`)
   - Enable "Sign In with Apple"
   - Configure the Sign In with Apple settings:
     - **Primary App ID**: Select your App ID
     - **Domains and Subdomains**: `localhost` (for dev) or your domain
     - **Return URLs**: `http://localhost:3000/api/auth/callback/apple`
4. Create a **Key** for Sign In with Apple:
   - Enable "Sign In with Apple"
   - Configure and download the `.p8` key file
5. Add to your `.env`:
   ```
   APPLE_ID="com.yourapp.signin"
   APPLE_SECRET="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----"
   ```
   Note: For Apple, you may also need `APPLE_TEAM_ID` and `APPLE_KEY_ID` depending on your setup.

## Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen (use "External" for testing)
6. Create OAuth Client ID:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**
8. Add to your `.env`:
   ```
   GOOGLE_ID="your-client-id-here.apps.googleusercontent.com"
   GOOGLE_SECRET="your-client-secret-here"
   ```

## Testing Without OAuth (Development)

If you don't want to set up OAuth immediately, you can:

1. Comment out the providers in `src/lib/auth.ts`
2. Use the demo user that's already seeded in the database
3. The app will still work, but sign-in buttons will be disabled

## Environment Variables

Make sure your `.env` file has:

```env
# Required
DATABASE_URL="postgresql://user@localhost:5432/clique?schema=public"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your-secret-here"

# OAuth (get from provider dashboards)
FACEBOOK_ID="..."
FACEBOOK_SECRET="..."
APPLE_ID="..."
APPLE_SECRET="..."
GOOGLE_ID="..."
GOOGLE_SECRET="..."
```

## Production Setup

For production deployment:

1. Update `NEXTAUTH_URL` to your production domain
2. Generate a secure `AUTH_SECRET`: `openssl rand -base64 32`
3. Update OAuth callback URLs in Facebook/Apple/Google to use your production domain
4. Set environment variables in your hosting platform (Vercel, Railway, etc.)
