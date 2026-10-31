// Quyết định ủy quyền ở server cho thao tác thành viên tổ chức (WO04-02).
// Thứ tự kiểm tra khớp với hàm SQL tương ứng trong supabase/migrations/0001_initial.sql,
// để kiểm thử đối chiếu (tests/security/policy-parity.test.ts) có thể so sánh từng ô ma trận.
// Không kiểm tra hồ sơ đích tồn tại hay đã là thành viên: phần đó do cơ sở dữ liệu kiểm (P0002, 23505).

import { canInvite, canRevokeOther, isOrgRole, type OrgRole } from '@aftervia/domain';

export type DenyReason =
  | 'not_authenticated'
  | 'invalid_target'
  | 'invalid_role'
  | 'forbidden'
  | 'self_assignment'
  | 'self_role_change'
  | 'target_not_member'
  | 'last_owner';

export type Decision = { allowed: true } | { allowed: false; reason: DenyReason };

export interface ActorState {
  userId: string | null;
  /** Vai trò đang hoạt động của actor trong tổ chức; null nếu không phải thành viên đang hoạt động. */
  role: OrgRole | null;
}

export interface TargetState {
  userId: string;
  /** Vai trò đang hoạt động của đích; null nếu không phải thành viên đang hoạt động. */
  role: OrgRole | null;
}

const ALLOW: Decision = { allowed: true };
const deny = (reason: DenyReason): Decision => ({ allowed: false, reason });

export function authorizeInvite(input: { actor: ActorState; targetId: string | null; role: string }): Decision {
  if (!input.actor.userId) return deny('not_authenticated');
  if (!input.targetId) return deny('invalid_target');
  if (!isOrgRole(input.role)) return deny('invalid_role');
  if (input.actor.role === null) return deny('forbidden');
  if (input.targetId === input.actor.userId) return deny('self_assignment');
  if (!canInvite(input.actor.role, input.role)) return deny('forbidden');
  return ALLOW;
}

export function authorizeRoleChange(input: {
  actor: ActorState;
  target: TargetState;
  newRole: string;
  /** Số owner đang hoạt động, không tính đích. */
  otherActiveOwners: number;
}): Decision {
  if (!input.actor.userId) return deny('not_authenticated');
  if (input.actor.role !== 'owner') return deny('forbidden');
  if (input.target.userId === input.actor.userId) return deny('self_role_change');
  if (!isOrgRole(input.newRole)) return deny('invalid_role');
  if (input.target.role === null) return deny('target_not_member');
  if (input.target.role === input.newRole) return ALLOW;
  if (input.target.role === 'owner' && input.newRole !== 'owner' && input.otherActiveOwners === 0) {
    return deny('last_owner');
  }
  return ALLOW;
}

export function authorizeRevoke(input: {
  actor: ActorState;
  target: TargetState;
  /** Số owner đang hoạt động, không tính đích. */
  otherActiveOwners: number;
}): Decision {
  if (!input.actor.userId) return deny('not_authenticated');
  if (input.actor.role === null) return deny('forbidden');
  if (input.target.role === null) return deny('target_not_member');
  const isSelf = input.target.userId === input.actor.userId;
  if (!isSelf && !canRevokeOther(input.actor.role, input.target.role)) return deny('forbidden');
  if (input.target.role === 'owner' && input.otherActiveOwners === 0) return deny('last_owner');
  return ALLOW;
}
