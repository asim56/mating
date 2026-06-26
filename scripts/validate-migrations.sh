#!/usr/bin/env bash
#
# Validates Supabase SQL migrations as a CI gate (DEVOPS-01).
# Checks that every migration:
#   - is non-empty
#   - follows the `<14-digit-timestamp>_<name>.sql` naming convention
#   - contains at least one SQL statement terminator
#
# Fails (non-zero exit) on the first malformed migration.

set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "error: ${MIGRATIONS_DIR} does not exist" >&2
  exit 1
fi

shopt -s nullglob
migrations=("${MIGRATIONS_DIR}"/*.sql)

if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "error: no migrations found in ${MIGRATIONS_DIR}" >&2
  exit 1
fi

naming_re='^[0-9]{14}_[a-z0-9_]+\.sql$'
status=0

for file in "${migrations[@]}"; do
  name="$(basename "${file}")"
  echo "Validating ${name}"

  if [[ ! -s "${file}" ]]; then
    echo "  error: migration is empty" >&2
    status=1
    continue
  fi

  if [[ ! "${name}" =~ ${naming_re} ]]; then
    echo "  error: name must match <14-digit-timestamp>_<snake_name>.sql" >&2
    status=1
    continue
  fi

  if ! grep -q ';' "${file}"; then
    echo "  error: migration contains no SQL statement terminator (';')" >&2
    status=1
    continue
  fi
done

if [[ ${status} -ne 0 ]]; then
  echo "Migration validation failed." >&2
  exit ${status}
fi

echo "All ${#migrations[@]} migration(s) valid."
