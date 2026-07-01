import assert from 'node:assert/strict';
import test from 'node:test';

import { AuditService } from '../../src/modules/audit/audit.service';
import type { AuditRepository } from '../../src/modules/audit/audit.repository';

test('AuditService emits structured events to repository', async () => {
  const rows: unknown[] = [];
  const repo: AuditRepository = {
    insert: async (row) => {
      rows.push(row);
    },
  };
  const svc = new AuditService(repo);
  await svc.emit({
    action: 'role.granted',
    actorId: 'admin-1',
    subjectType: 'account',
    subjectId: 'user-1',
    metadata: { role: 'breeder' },
  });
  assert.equal(rows.length, 1);
});
