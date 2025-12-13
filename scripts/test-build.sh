#!/bin/bash
# Test build script - simulates Vercel deployment locally using Docker
# Runs tests with coverage checks before building

set -e  # Exit on error

echo "🚀 Starting local Vercel build simulation..."
echo "   This will run: tests with coverage → integration tests → Next.js build"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the Docker image
echo "📦 Building Docker image (running tests with coverage + build)..."
if docker build -f Dockerfile.test -t clique-build-test . ; then
    echo -e "${GREEN}✅ Docker build successful!${NC}"
    echo ""
    
    # Run the container to verify
    echo "🔍 Verifying build artifacts..."
    if docker run --rm clique-build-test ; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ BUILD VERIFICATION PASSED${NC}"
        echo -e "${GREEN}════════════════════════════════════════${NC}"
        echo ""
        echo "Your code is ready to push to the PR!"
        echo "✓ Tests passed with coverage requirements met"
        echo "✓ Integration tests passed"
        echo "✓ Next.js build completed successfully"
        echo ""
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Container run failed${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}❌ BUILD VERIFICATION FAILED${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}The build would fail in Vercel.${NC}"
    echo "Possible causes:"
    echo "  • Tests failed"
    echo "  • Coverage thresholds not met"
    echo "  • Integration tests failed"
    echo "  • Next.js build errors"
    echo ""
    echo "Fix the errors above before pushing to the PR."
    echo ""
    exit 1
fi
