import { roleHasTenantPermissions, TENANT_PERMISSIONS } from './tenant-permissions.js'

describe('tenant permissions', () => {
  it('keeps role capabilities cumulative', () => {
    expect(roleHasTenantPermissions('USER', [TENANT_PERMISSIONS.MEMBERSHIP_READ_SELF])).toBe(true)
    expect(roleHasTenantPermissions('MANAGER', [TENANT_PERMISSIONS.MEMBERSHIP_READ_SELF, TENANT_PERMISSIONS.MEMBERSHIP_READ_SCOPED])).toBe(true)
    expect(roleHasTenantPermissions('MANAGER', [TENANT_PERMISSIONS.INVITATION_CREATE_SCOPED, TENANT_PERMISSIONS.INVITATION_REVOKE_SCOPED])).toBe(true)
    expect(roleHasTenantPermissions('CEO', [TENANT_PERMISSIONS.MEMBERSHIP_READ_SELF, TENANT_PERMISSIONS.MEMBERSHIP_READ_SCOPED, TENANT_PERMISSIONS.TEAM_CREATE])).toBe(true)
  })

  it('does not grant management capabilities below their role', () => {
    expect(roleHasTenantPermissions('USER', [TENANT_PERMISSIONS.MEMBERSHIP_READ_SCOPED])).toBe(false)
    expect(roleHasTenantPermissions('MANAGER', [TENANT_PERMISSIONS.MEMBERSHIP_SUSPEND])).toBe(false)
    expect(roleHasTenantPermissions('MANAGER', [TENANT_PERMISSIONS.TEAM_CREATE])).toBe(false)
    expect(roleHasTenantPermissions('USER', [TENANT_PERMISSIONS.INVITATION_READ_SCOPED])).toBe(false)
  })

  it('requires every declared permission', () => {
    expect(roleHasTenantPermissions('MANAGER', [TENANT_PERMISSIONS.MEMBERSHIP_READ_SCOPED, TENANT_PERMISSIONS.TEAM_CREATE])).toBe(false)
  })
})
