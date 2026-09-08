import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Projeto66Context } from './projeto66-context'
import { Projeto66ProgressPage } from './pages/Projeto66ProgressPage'
import { Projeto66JourneyPage } from './pages/Projeto66JourneyPage'
import { Projeto66OverviewPage } from './pages/Projeto66OverviewPage'

function renderCycle(page, durationDays, overrides = {}) {
  const cycle = {
    status: 'ACTIVE', durationDays, currentDay: durationDays,
    completedDays: Array.from({ length: durationDays }, (_, index) => index + 1),
    dailyRecords: {}, ...overrides,
  }
  return render(<MemoryRouter><Projeto66Context.Provider value={{ cycle }}>{page}</Projeto66Context.Provider></MemoryRouter>)
}

describe('duration from the enrolled program version', () => {
  it.each([66, 77])('renders the full %s-day heatmap and phase totals', (durationDays) => {
    const { container } = renderCycle(<Projeto66ProgressPage />, durationDays)
    expect(screen.getByRole('heading', { name: `Mapa de calor — ${durationDays} dias` })).toBeTruthy()
    expect(container.querySelectorAll('.p66-heatmap span')).toHaveLength(durationDays)
    expect(container.querySelector('.p66-heatmap .current').textContent).toBe(String(durationDays))
    expect(container.querySelector('.p66-phase-progress article:last-child small').textContent).toBe(`${durationDays - 44} de ${durationDays - 44} dias`)
    expect(container.querySelector('.p66-progress-card small').textContent).toBe('100%')
    expect(screen.getByText(`Dia ${durationDays}: pendente (dia atual)`)).toBeTruthy()
  })

  it.each([66, 77])('places the closing ritual on day %s', async (durationDays) => {
    const user = userEvent.setup()
    renderCycle(<Projeto66JourneyPage />, durationDays)
    expect(screen.getByText(new RegExp(`compromisso dos ${durationDays} dias`))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Fase 3' }))
    expect(screen.getByText(`Dias 45–${durationDays}`)).toBeTruthy()
    expect(screen.getByText(`Dia 59–${durationDays - 1}`)).toBeTruthy()
    expect(screen.getByText(`Dia ${durationDays}`)).toBeTruthy()
  })

  it('offers 77 days before an available enrollment has a bound version', () => {
    renderCycle(<Projeto66OverviewPage />, 0, { status: 'AVAILABLE', currentDay: 0 })
    expect(screen.getByRole('button', { name: 'Iniciar meu ciclo de 77 dias' })).toBeTruthy()
  })
})
