#!/bin/bash

# PR Monitoring Script
# Usage: ./scripts/watch-pr.sh <PR_NUMBER>
# Example: ./scripts/watch-pr.sh 8

set -e

PR_NUMBER=$1
CHECK_INTERVAL=${2:-60}  # Default to 60 seconds

if [ -z "$PR_NUMBER" ]; then
  echo "❌ Error: PR number required"
  echo "Usage: ./scripts/watch-pr.sh <PR_NUMBER> [CHECK_INTERVAL_SECONDS]"
  echo "Example: ./scripts/watch-pr.sh 8 30"
  exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ Error: GitHub CLI (gh) is not installed"
  echo "Install it with: brew install gh"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ Error: Not authenticated with GitHub CLI"
  echo "Run: gh auth login"
  exit 1
fi

echo "👀 Monitoring PR #$PR_NUMBER (checking every ${CHECK_INTERVAL}s)"
echo "Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LAST_CHECK_STATE=""
LAST_REVIEW_STATE=""
LAST_COMMENT_COUNT=0
LAST_UNRESOLVED_COUNT=0

while true; do
  clear
  echo "🔍 PR #$PR_NUMBER Status Check - $(date '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Get PR details
  PR_DATA=$(gh pr view $PR_NUMBER --json title,state,isDraft,reviewDecision,statusCheckRollup,comments 2>&1)
  
  if [ $? -ne 0 ]; then
    echo "❌ Error fetching PR data: $PR_DATA"
    sleep $CHECK_INTERVAL
    continue
  fi
  
  # Parse PR info
  TITLE=$(echo "$PR_DATA" | jq -r '.title')
  STATE=$(echo "$PR_DATA" | jq -r '.state')
  IS_DRAFT=$(echo "$PR_DATA" | jq -r '.isDraft')
  REVIEW_DECISION=$(echo "$PR_DATA" | jq -r '.reviewDecision // "PENDING"')
  
  echo "📋 Title: $TITLE"
  echo "📌 State: $STATE"
  
  if [ "$IS_DRAFT" = "true" ]; then
    echo "📝 Draft: Yes"
  fi
  
  echo ""
  
  # Check CI/CD status
  echo "🔧 CI/CD Checks:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  CHECK_COUNT=$(echo "$PR_DATA" | jq '.statusCheckRollup | length')
  
  if [ "$CHECK_COUNT" -eq 0 ]; then
    echo "⏳ No checks running yet..."
    CURRENT_CHECK_STATE="NONE"
  else
    PASSING=0
    FAILING=0
    PENDING=0
    
    echo "$PR_DATA" | jq -r '.statusCheckRollup[] | "\(.name)|\(.status)|\(.conclusion // "PENDING")"' | while IFS='|' read -r name status conclusion; do
      if [ "$conclusion" = "SUCCESS" ]; then
        echo "  ✅ $name"
        ((PASSING++))
      elif [ "$conclusion" = "FAILURE" ]; then
        echo "  ❌ $name - FAILED"
        ((FAILING++))
      elif [ "$conclusion" = "PENDING" ] || [ "$status" = "IN_PROGRESS" ]; then
        echo "  ⏳ $name - Running..."
        ((PENDING++))
      else
        echo "  ⚠️  $name - $conclusion"
      fi
    done
    
    # Determine overall state
    if [ $(echo "$PR_DATA" | jq '[.statusCheckRollup[] | select(.conclusion == "FAILURE")] | length') -gt 0 ]; then
      CURRENT_CHECK_STATE="FAILURE"
    elif [ $(echo "$PR_DATA" | jq '[.statusCheckRollup[] | select(.status == "IN_PROGRESS" or .conclusion == "PENDING")] | length') -gt 0 ]; then
      CURRENT_CHECK_STATE="PENDING"
    else
      CURRENT_CHECK_STATE="SUCCESS"
    fi
    
    echo ""
    echo "Summary: $(echo "$PR_DATA" | jq '[.statusCheckRollup[] | select(.conclusion == "SUCCESS")] | length') passing, $(echo "$PR_DATA" | jq '[.statusCheckRollup[] | select(.conclusion == "FAILURE")] | length') failing, $(echo "$PR_DATA" | jq '[.statusCheckRollup[] | select(.status == "IN_PROGRESS" or .conclusion == "PENDING")] | length') pending"
  fi
  
  echo ""
  
  # Check review status
  echo "👥 Review Status:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  case "$REVIEW_DECISION" in
    "APPROVED")
      echo "  ✅ Approved"
      ;;
    "CHANGES_REQUESTED")
      echo "  🔄 Changes requested"
      ;;
    "REVIEW_REQUIRED")
      echo "  ⏳ Review required"
      ;;
    *)
      echo "  ⏳ Pending review"
      ;;
  esac
  
  echo ""
  
  # Check for unresolved comments
  echo "💬 Comments:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  COMMENT_COUNT=$(echo "$PR_DATA" | jq '.comments | length')
  
  if [ "$COMMENT_COUNT" -eq 0 ]; then
    echo "  No comments yet"
  else
    echo "  Total comments: $COMMENT_COUNT"
    
    # Get review comments with proper resolution status
    REVIEW_COMMENTS=$(gh api graphql -f query='
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            reviewThreads(first: 100) {
              nodes {
                isResolved
                isCollapsed
                comments(first: 1) {
                  nodes {
                    path
                    body
                  }
                }
              }
            }
          }
        }
      }
    ' -f owner=navybrmi -f repo=clique -F number=$PR_NUMBER 2>&1)
    
    if [ $? -eq 0 ]; then
      TOTAL_THREADS=$(echo "$REVIEW_COMMENTS" | jq '.data.repository.pullRequest.reviewThreads.nodes | length')
      UNRESOLVED=$(echo "$REVIEW_COMMENTS" | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length')
      RESOLVED=$(echo "$REVIEW_COMMENTS" | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == true)] | length')
      
      if [ "$TOTAL_THREADS" -gt 0 ]; then
        echo "  Review threads: $TOTAL_THREADS total"
        echo "    ⚠️  Unresolved: $UNRESOLVED"
        echo "    ✅ Resolved: $RESOLVED"
      fi
    fi
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Detect state changes and alert
  if [ -n "$LAST_CHECK_STATE" ]; then
    if [ "$CURRENT_CHECK_STATE" != "$LAST_CHECK_STATE" ]; then
      echo ""
      echo "🔔 CHECK STATE CHANGED: $LAST_CHECK_STATE → $CURRENT_CHECK_STATE"
      
      # Play system sound (macOS)
      if [ "$CURRENT_CHECK_STATE" = "FAILURE" ]; then
        afplay /System/Library/Sounds/Basso.aiff 2>/dev/null || true
      elif [ "$CURRENT_CHECK_STATE" = "SUCCESS" ]; then
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
      fi
    fi
    
    if [ "$REVIEW_DECISION" != "$LAST_REVIEW_STATE" ]; then
      echo ""
      echo "🔔 REVIEW STATE CHANGED: $LAST_REVIEW_STATE → $REVIEW_DECISION"
      afplay /System/Library/Sounds/Ping.aiff 2>/dev/null || true
    fi
    
    if [ "$COMMENT_COUNT" -gt "$LAST_COMMENT_COUNT" ]; then
      NEW_COMMENTS=$((COMMENT_COUNT - LAST_COMMENT_COUNT))
      echo ""
      echo "🔔 NEW COMMENT(S): +$NEW_COMMENTS"
      afplay /System/Library/Sounds/Purr.aiff 2>/dev/null || true
    fi
    
    # Track unresolved comment changes
    if [ -n "$UNRESOLVED" ] && [ "$UNRESOLVED" -ne "$LAST_UNRESOLVED_COUNT" ]; then
      echo ""
      if [ "$UNRESOLVED" -lt "$LAST_UNRESOLVED_COUNT" ]; then
        RESOLVED_COUNT=$((LAST_UNRESOLVED_COUNT - UNRESOLVED))
        echo "🔔 REVIEW COMMENTS RESOLVED: -$RESOLVED_COUNT (now $UNRESOLVED unresolved)"
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
      else
        NEW_UNRESOLVED=$((UNRESOLVED - LAST_UNRESOLVED_COUNT))
        echo "🔔 NEW UNRESOLVED COMMENTS: +$NEW_UNRESOLVED (now $UNRESOLVED unresolved)"
        afplay /System/Library/Sounds/Funk.aiff 2>/dev/null || true
      fi
    fi
  fi
  
  LAST_CHECK_STATE=$CURRENT_CHECK_STATE
  LAST_REVIEW_STATE=$REVIEW_DECISION
  LAST_COMMENT_COUNT=$COMMENT_COUNT
  LAST_UNRESOLVED_COUNT=${UNRESOLVED:-0}
  
  echo ""
  echo "Next check in ${CHECK_INTERVAL}s... (Ctrl+C to stop)"
  
  sleep $CHECK_INTERVAL
done
