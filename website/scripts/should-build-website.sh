#!/bin/bash

# This script is used by Vercel to determine whether to build the website or not
# Exit code 1: Skip build (no changes in website directory)  
# Exit code 0: Proceed with build (changes found in website directory)

echo "Checking if website directory has changes..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Not in a git repository, proceeding with build"
  exit 0
fi

# Get the previous commit (HEAD~1) to compare with current commit
PREV_COMMIT="HEAD~1"

# If this is the first commit, compare with empty tree
if ! git rev-parse --verify $PREV_COMMIT > /dev/null 2>&1; then
  echo "First commit detected, proceeding with build"
  exit 0
fi

# Check if there are any changes in the website directory
if git diff --name-only $PREV_COMMIT HEAD | grep -E "^website/" > /dev/null; then
  echo "Changes detected in website directory, proceeding with build"
  exit 0
else
  echo "No changes in website directory, skipping build"
  exit 1
fi