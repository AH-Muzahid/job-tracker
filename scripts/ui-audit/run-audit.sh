#!/usr/bin/env bash
# Run UI audit using ESLint with custom rules derived from the Efferd design skill.
# This script scans all TypeScript/TSX files under src/ and outputs a JSON report.

# Ensure we are in the project root
cd "$(dirname "$0")/../.."

echo "Running UI audit..."

# Run ESLint (assumes .eslintrc.cjs exists and includes custom design rules)
npx eslint "src/**/*.tsx" "src/**/*.ts" -c .eslintrc.cjs --format json > scripts/ui-audit/audit-report.json

if [ $? -ne 0 ]; then
  echo "UI audit found violations. See scripts/ui-audit/audit-report.json"
  exit 1
else
  echo "UI audit passed with no violations."
  exit 0
fi
