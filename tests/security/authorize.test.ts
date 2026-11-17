import { describe, expect, it } from 'vitest';
import { authorizeInvite, authorizeRevoke, authorizeRoleChange } from '../../services/api/src/auth/authorize';

const owner = { userId: 'owner-id', role: 'owner' as const };
const manager = { userId: 'manager-id', role: 'manager' as const };
const agent = { userId: 'agent-id', role: 'agent' as const };
const outsider = { userId: 'outsider-id', role: null };

describe('T06 pure authorization policy, no database', () => {
  it('T06 a manager may invite an agent but not a manager or an owner', () => {
    expect(authorizeInvite({ actor: manager, targetId: 'x', role: 'agent' })).toEqual({ allowed: true });
    expect(authorizeInvite({ actor: manager, targetId: 'x', role: 'manager' })).toEqual({ allowed: false, reason: 'forbidden' });
    expect(authorizeInvite({ actor: manager, targetId: 'x', role: 'owner' })).toEqual({ allowed: false, reason: 'forbidden' });
  });

  it('T06 an agent cannot invite anyone, and an outsider cannot invite anyone', () => {
    expect(authorizeInvite({ actor: agent, targetId: 'x', role: 'agent' })).toEqual({ allowed: false, reason: 'forbidden' });
    expect(authorizeInvite({ actor: outsider, targetId: 'x', role: 'agent' })).toEqual({ allowed: false, reason: 'forbidden' });
  });

  it('T06 nobody can assign a role to themselves', () => {
    expect(authorizeInvite({ actor: owner, targetId: 'owner-id', role: 'agent' })).toEqual({ allowed: false, reason: 'self_assignment' });
  });

  it('T06 an invalid role is refused before any membership check', () => {
    expect(authorizeInvite({ actor: owner, targetId: 'x', role: 'superuser' })).toEqual({ allowed: false, reason: 'invalid_role' });
    expect(authorizeInvite({ actor: owner, targetId: null, role: 'agent' })).toEqual({ allowed: false, reason: 'invalid_target' });
  });

  it('T06 only an owner changes roles, and an owner never changes their own role', () => {
    const target = { userId: 'agent-id', role: 'agent' as const };
    expect(authorizeRoleChange({ actor: owner, target, newRole: 'manager', otherActiveOwners: 1 })).toEqual({ allowed: true });
    expect(authorizeRoleChange({ actor: manager, target, newRole: 'manager', otherActiveOwners: 1 })).toEqual({ allowed: false, reason: 'forbidden' });
    expect(authorizeRoleChange({ actor: owner, target: { userId: 'owner-id', role: 'owner' }, newRole: 'manager', otherActiveOwners: 1 })).toEqual({ allowed: false, reason: 'self_role_change' });
  });

  it('T06 the last active owner cannot be demoted or revoked', () => {
    const lastOwner = { userId: 'owner-id', role: 'owner' as const };
    expect(authorizeRoleChange({ actor: { userId: 'x', role: 'owner' }, target: lastOwner, newRole: 'agent', otherActiveOwners: 0 })).toEqual({ allowed: false, reason: 'last_owner' });
    expect(authorizeRevoke({ actor: { userId: 'x', role: 'owner' }, target: lastOwner, otherActiveOwners: 0 })).toEqual({ allowed: false, reason: 'last_owner' });
  });

  it('T06 a manager can revoke an agent but not another manager', () => {
    expect(authorizeRevoke({ actor: manager, target: { userId: 'agent-id', role: 'agent' }, otherActiveOwners: 1 })).toEqual({ allowed: true });
    expect(authorizeRevoke({ actor: manager, target: { userId: 'm2', role: 'manager' }, otherActiveOwners: 1 })).toEqual({ allowed: false, reason: 'forbidden' });
  });

  it('T06 anyone who is a member may leave, but an outsider cannot revoke anyone', () => {
    expect(authorizeRevoke({ actor: agent, target: { userId: 'agent-id', role: 'agent' }, otherActiveOwners: 1 })).toEqual({ allowed: true });
    expect(authorizeRevoke({ actor: outsider, target: { userId: 'agent-id', role: 'agent' }, otherActiveOwners: 1 })).toEqual({ allowed: false, reason: 'forbidden' });
  });
});
