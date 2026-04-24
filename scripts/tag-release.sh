#!/bin/bash

# Git Release Tagger
# Creates annotated git tag with release metadata
#
# Usage:
#   ./scripts/tag-release.sh v0.1.0
#   ./scripts/tag-release.sh v0.1.0 "Release notes here"

VERSION=$1
RELEASE_NOTES=$2

if [ -z "$VERSION" ]; then
  echo "❌ Usage: ./scripts/tag-release.sh <version> [release-notes]"
  echo "   Example: ./scripts/tag-release.sh v0.1.0"
  exit 1
fi

# Validate version format
if ! [[ $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
  echo "❌ Invalid version format: $VERSION"
  echo "   Expected: v0.1.0 or v0.1.0-rc.1"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Only allow tagging from main or develop
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "develop" ]]; then
  echo "❌ Can only tag from 'main' or 'develop' branch, currently on: $CURRENT_BRANCH"
  exit 1
fi

# Check if tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "❌ Tag $VERSION already exists"
  exit 1
fi

# Create annotated tag with metadata
TAG_MESSAGE="$VERSION - $(date '+%Y-%m-%d')"

if [ -z "$RELEASE_NOTES" ]; then
  TAG_MESSAGE="$TAG_MESSAGE\n\nRelease tagged by: $(git config user.email)"
else
  TAG_MESSAGE="$TAG_MESSAGE\n\n$RELEASE_NOTES\n\nTagged by: $(git config user.email)"
fi

echo "📌 Creating tag: $VERSION"
git tag -a "$VERSION" -m "$TAG_MESSAGE"

if [ $? -eq 0 ]; then
  echo "✅ Tag created: $VERSION"
  echo ""
  echo "📝 Next steps:"
  echo "   1. git push origin $VERSION"
  echo "   2. Create release on GitHub with release notes"
  echo ""
  echo "🔍 View tag:"
  echo "   git show $VERSION"
  echo ""
else
  echo "❌ Failed to create tag"
  exit 1
fi
