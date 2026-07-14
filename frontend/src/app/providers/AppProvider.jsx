import { AppContext } from './app-context'

const mockSession = {
  user: { id: 'user-1', name: 'Eduardo Pires', email: 'eduardo@spark.com.br' },
  tenant: { id: 'tenant-spark', name: 'Spark Inteligência Corporativa' },
  membership: { id: 'membership-1', role: 'CEO' },
}

export function AppProvider({ children }) {
  return <AppContext.Provider value={mockSession}>{children}</AppContext.Provider>
}
