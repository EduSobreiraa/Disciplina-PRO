import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GamificationProvider } from './GamificationProvider'
import { useGamification } from './gamification-context'

const mocks = vi.hoisted(() => ({
  session: null,
  repository: { loadMine: vi.fn() },
}))

vi.mock('../../app/providers/app-context', () => ({ useAppContext: () => mocks.session }))
vi.mock('./repositories/gamification.http.repository', () => ({ createGamificationHttpRepository: () => mocks.repository }))

const projection = (balance) => ({
  balance,
  level: { level: 1, key: 'recruit', name: 'Recruta', minimum: 0 },
  nextLevel: { level: 2, key: 'soldier', name: 'Soldado', minimum: 500 },
  progress: balance / 5,
  transactions: [],
  achievements: [],
})

function ProjectionConsumer() {
  const gamification = useGamification()
  return <div data-testid="projection">{gamification.status}:{gamification.xp}:{gamification.level.medal}</div>
}

describe('GamificationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session = {
      authenticated: false,
      tenant: null,
      sessionClient: { authorizedFetch: vi.fn() },
    }
  })

  it('keeps the projection idle when there is no authenticated tenant', async () => {
    render(<GamificationProvider><ProjectionConsumer /></GamificationProvider>)
    expect(screen.getByTestId('projection').textContent).toBe('idle:0:🥉')
    expect(mocks.repository.loadMine).not.toHaveBeenCalled()
  })

  it('loads the projection and announces a later XP increase', async () => {
    mocks.session = { ...mocks.session, authenticated: true, tenant: { id: 'tenant-1' } }
    mocks.repository.loadMine.mockResolvedValueOnce(projection(100)).mockResolvedValueOnce(projection(125))

    render(<GamificationProvider><ProjectionConsumer /></GamificationProvider>)
    await waitFor(() => expect(screen.getByTestId('projection').textContent).toBe('ready:100:🥉'))

    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('+25 XP'))
    expect(screen.getByTestId('projection').textContent).toBe('ready:125:🥉')
  })
})
