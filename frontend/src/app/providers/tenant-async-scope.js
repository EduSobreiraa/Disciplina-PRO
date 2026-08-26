export function createTenantAsyncScope(initialTenantId) {
  let tenantId = initialTenantId
  let generation = 0

  return {
    sync(nextTenantId) {
      if (tenantId === nextTenantId) return generation
      tenantId = nextTenantId
      generation += 1
      return generation
    },
    capture() {
      return { tenantId, generation }
    },
    isCurrent(scope) {
      return scope.tenantId === tenantId && scope.generation === generation
    },
    commit(scope, operation) {
      if (!this.isCurrent(scope)) return false
      operation()
      return true
    },
  }
}

export function tenantScopeKey(tenantId) {
  return tenantId ?? 'anonymous'
}
