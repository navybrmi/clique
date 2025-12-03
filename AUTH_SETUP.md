# Authentication Setup Guide

This app uses NextAuth.js v5 for authentication with GitHub and Google OAuth providers.

## Quick Start for Development

For local development, you can use demo credentials or set up your own OAuth apps.

## Setting up GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Clique Dev
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add to your `.env`:
   ```
   GITHUB_ID="your-client-id-here"
   GITHUB_SECRET="your-client-secret-here"
   ```

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
GITHUB_ID="..."
GITHUB_SECRET="..."
GOOGLE_ID="..."
GOOGLE_SECRET="..."
```

## Production Setup

For production deployment:

1. Update `NEXTAUTH_URL` to your production domain
2. Generate a secure `AUTH_SECRET`: `openssl rand -base64 32`
3. Update OAuth callback URLs in GitHub/Google to use your production domain
4. Set environment variables in your hosting platform (Vercel, Railway, etc.)
