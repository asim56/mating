import type { ACCOUNT_STATUSES, SESSION_STATUSES, SELF_SELECTABLE_ROLES } from '../constants/auth';
import type { UserRole } from './index';

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type SelfSelectableRole = (typeof SELF_SELECTABLE_ROLES)[number];

export type Session = {
  id: string;
  accountId: string;
  deviceDescriptor?: string | null;
  lastSeenAt: string;
  createdAt: string;
  status: SessionStatus;
  current?: boolean;
};

export type Profile = {
  accountId: string;
  displayName: string;
  regionCode: string;
  locale: string;
  primaryRole: SelfSelectableRole;
  profileComplete: boolean;
  phone?: string | null;
  email?: string | null;
};

export type ConsentRecord = {
  id: string;
  consentType: string;
  version: string;
  granted: boolean;
  createdAt: string;
};
