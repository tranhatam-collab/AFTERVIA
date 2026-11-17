// Quy tắc phân quyền tổ chức dùng chung giữa server và kiểm thử đối chiếu với SQL (WO04-02).
// Hàm trong file này thuần túy: không truy cập cơ sở dữ liệu, không biết trạng thái thành viên.

export const ORG_ROLES = ['owner', 'manager', 'agent'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === 'string' && (ORG_ROLES as readonly string[]).includes(value);
}

// Vai trò actor được phép mời. Owner mời mọi vai trò; manager chỉ mời agent; agent không mời ai.
const INVITABLE: Readonly<Record<OrgRole, readonly OrgRole[]>> = {
  owner: ['owner', 'manager', 'agent'],
  manager: ['agent'],
  agent: [],
};

// Vai trò actor được phép thu hồi khi đó là người khác. Owner thu hồi mọi vai trò; manager chỉ thu hồi agent.
const REVOCABLE: Readonly<Record<OrgRole, readonly OrgRole[]>> = {
  owner: ['owner', 'manager', 'agent'],
  manager: ['agent'],
  agent: [],
};

export function canInvite(actor: OrgRole, role: OrgRole): boolean {
  return INVITABLE[actor].includes(role);
}

export function canRevokeOther(actor: OrgRole, targetRole: OrgRole): boolean {
  return REVOCABLE[actor].includes(targetRole);
}

// Chỉ owner đổi vai trò, và không ai đổi vai trò của chính mình (chặn tự leo thang và tự hạ cấp).
export function canChangeRole(actor: OrgRole, actorIsTarget: boolean): boolean {
  return actor === 'owner' && !actorIsTarget;
}
