export type AuditQueryDto = {
  actorId?: string;
  subjectType?: string;
  subjectId?: string;
  action?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};
