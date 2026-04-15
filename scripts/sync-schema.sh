#!/bin/bash
# Fetch the live OpenAPI schema from the backend and regenerate TypeScript types.
# Usage:
#   ./scripts/sync-schema.sh                       # uses production API
#   BACKEND_URL=http://localhost:8000 ./scripts/sync-schema.sh  # uses local dev
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-https://api.echodesk.ge}"
SCHEMA_PATH="${SWAGGER_PATH:-/api/schema}"
SNAPSHOT_FILE="api-schema.snapshot.json"

echo "Fetching schema from ${BACKEND_URL}${SCHEMA_PATH}?format=json ..."
curl -sf "${BACKEND_URL}${SCHEMA_PATH}?format=json" -o "${SNAPSHOT_FILE}"

echo "Schema saved to ${SNAPSHOT_FILE}"
echo "Regenerating TypeScript types..."
npm run generate

echo ""
echo "Done. Review changes with:"
echo "  git diff src/api/generated/"
