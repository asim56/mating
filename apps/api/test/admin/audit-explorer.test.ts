import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryAuditLogsQueryRepository } from '../../src/modules/admin/audit-logs.repository';
import { AuditExplorerService } from '../../src/modules/admin/services/audit-explorer.service';
import { AuditRedactionService } from '../../src/modules/admin/services/audit-redaction.service';
import { ADMIN } from '../payments/fixtures';

test('audit query pagination and PII redaction (SC-005)', async () => {
  const repo = new InMemoryAuditLogsQueryRepository();
  await repo.insert({
    actorId: 'actor-1',
    subjectType: 'user',
    subjectId: 'user-1',
    action: 'verification.approved',
    metadata: { email: 'secret@example.com', reasonCode: 'ok' },
  });
  await repo.insert({
    actorId: 'actor-2',
    subjectType: 'user',
    subjectId: 'user-2',
    action: 'payment.reconciled',
    metadata: { phone: '+921234567890' },
  });

  const audit = { emit: async () => undefined };
  const service = new AuditExplorerService(repo, audit);

  const page = await service.query(ADMIN, { action: 'verification.', limit: 10 });
  assert.equal(page.data.length, 1);
  assert.match(String(page.data[0]!.metadata.email), /redacted/);

  const redaction = new AuditRedactionService();
  const redacted = redaction.redactMetadata({ phone: '+921234567890', reasonCode: 'x' });
  assert.equal(redacted.phone, '[redacted]');
  assert.equal(redacted.reasonCode, 'x');
});
