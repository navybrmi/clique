# Docker Build Verification

This directory contains files for verifying the Vercel build locally before pushing to GitHub.

## Quick Start

```bash
# Verify your build will pass in Vercel
npm run verify-build
```

This simulates the exact Vercel build environment and runs the same commands Vercel executes.

## What Gets Tested

✅ Clean `npm ci` install (like Vercel does)  
✅ Prisma client generation  
✅ All tests (component + integration)  
✅ Next.js production build  
✅ Build artifact verification  

## Files

- **`Dockerfile.test`** - Docker image that mimics Vercel's Node 20 environment
- **`.dockerignore`** - Excludes unnecessary files from Docker build context
- **`scripts/test-build.sh`** - Automated build verification script

## Manual Docker Commands

If you want more control, you can run Docker commands directly:

```bash
# Build the image
docker build -f Dockerfile.test -t clique-build-test .

# Run the container
docker run --rm clique-build-test

# Clean up (optional)
docker rmi clique-build-test
```

## Troubleshooting

### Build fails locally but passes on your machine?
- You may have stale `node_modules` or build cache
- Docker uses a clean environment every time

### Build takes a long time?
- First build downloads Node.js image (~100MB)
- Subsequent builds use cached layers and are faster

### Docker not installed?
```bash
# macOS (with Homebrew)
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop
```

## When to Use This

**Before every push to PR:**
```bash
npm run verify-build
```

**When CI keeps failing but tests pass locally:**
- Your local environment may have differences
- Docker ensures consistency with Vercel's environment

**After making changes to:**
- Test configurations
- Dependencies (package.json)
- Build process (next.config.ts)
- Database schema (Prisma)

## Benefits

🎯 **Catch issues early** - Before pushing to GitHub  
🚀 **Save time** - No waiting for CI to fail  
🔒 **Confidence** - Know your build will pass  
🐳 **Clean environment** - No local cache issues  

## Workflow Example

```bash
# Make changes
git add .
git commit -m "Add feature"

# Verify build will pass
npm run verify-build

# If it passes, push with confidence!
git push origin your-branch
```

## Notes

- The Docker image is ephemeral (deleted after verification)
- No persistent containers or volumes are created
- Build time: ~30-60 seconds (after first run)
- Uses Node.js 20 (same as Vercel's current default)
