#!/usr/bin/env bash
#
# Validates the API OpenAPI document as a CI gate (DEVOPS-01).
#   1. Regenerates apps/api/openapi.json from the live Nest application graph.
#   2. Asserts the document is valid OpenAPI 3 (openapi + paths present).
#   3. Fails if the regenerated document drifts from the committed copy.
#
# Assumes the API has already been built (`pnpm --filter @mating/api build`).

set -euo pipefail

OPENAPI_FILE="apps/api/openapi.json"

echo "Regenerating ${OPENAPI_FILE}"
pnpm --filter @mating/api openapi:export

if [[ ! -s "${OPENAPI_FILE}" ]]; then
  echo "error: ${OPENAPI_FILE} was not produced" >&2
  exit 1
fi

node -e '
  const doc = require("./apps/api/openapi.json");
  if (typeof doc.openapi !== "string" || !doc.openapi.startsWith("3.")) {
    console.error("error: missing or invalid openapi version");
    process.exit(1);
  }
  if (!doc.paths || Object.keys(doc.paths).length === 0) {
    console.error("error: OpenAPI document has no paths");
    process.exit(1);
  }
  console.log(`OpenAPI ${doc.openapi} valid with ${Object.keys(doc.paths).length} path(s).`);
'

if [[ -n "$(git status --porcelain -- "${OPENAPI_FILE}")" ]]; then
  echo "error: ${OPENAPI_FILE} is out of date or uncommitted. Run 'pnpm --filter @mating/api build && pnpm --filter @mating/api openapi:export' and commit the result." >&2
  git --no-pager diff -- "${OPENAPI_FILE}" || true
  exit 1
fi

echo "OpenAPI document is valid and up to date."
