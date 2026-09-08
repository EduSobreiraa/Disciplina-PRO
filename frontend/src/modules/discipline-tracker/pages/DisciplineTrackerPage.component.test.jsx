import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DisciplineTrackerPage } from './DisciplineTrackerPage'

const mocks = vi.hoisted(() => ({
  dateKey: '2026-09-06',
  parseBackup: vi.fn(),
  tracker: null,
}))

vi.mock('../../../app/providers/app-context', () => ({
  useAppContext: () => ({ tenant: { timeZone: 'America/Bahia' } }),
}))
vi.mock('../../daily-ritual/repositories/daily-ritual.http.repository', () => ({
  getDateKeyInTimeZone: () => mocks.dateKey,
}))
vi.mock('../hooks/useDisciplineTracker', () => ({ useDisciplineTracker: () => mocks.tracker }))
vi.mock('../services/tracker-backup', () => ({ parseTrackerBackup: mocks.parseBackup }))
vi.mock('../components/TrackerInsights', () => ({ TrackerInsights: () => <aside>Insights do tracker</aside> }))
vi.mock('../components/JustificationCenter', () => ({
  JustificationCenter: ({ items, onEdit }) => <aside>{items.map((item) => <button type="button" key={item.key} onClick={() => onEdit(item)}>Editar {item.behaviorName}</button>)}</aside>,
}))

function createTracker(overrides = {}) {
  return {
    status: 'ready',
    error: null,
    mutating: false,
    state: {
      behaviors: [{ id: 'habit-1', name: 'Planejar o dia', active: true, order: 1 }],
      marks: {},
      justifications: {},
    },
    stats: {
      percent: 75,
      markedDays: 4,
      perfectDays: 3,
      reds: 1,
      byBehavior: { 'habit-1': { percent: 75 } },
    },
    reload: vi.fn().mockResolvedValue(undefined),
    cycleMark: vi.fn().mockResolvedValue({ key: '2026-09-06:habit-1', status: 2 }),
    saveJustification: vi.fn().mockResolvedValue(undefined),
    addBehavior: vi.fn().mockResolvedValue(undefined),
    renameBehavior: vi.fn().mockResolvedValue(undefined),
    removeBehavior: vi.fn().mockResolvedValue(undefined),
    exportBackup: vi.fn().mockResolvedValue({ version: 1 }),
    restoreBackup: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('DisciplineTrackerPage', () => {
  it('announces loading until the tracker is ready', () => {
    mocks.tracker = createTracker({ status: 'loading' })
    const { container, rerender } = render(<DisciplineTrackerPage />)
    expect(container.querySelector('[aria-live="polite"]')?.getAttribute('aria-atomic')).toBe('true')
    mocks.tracker.status = 'ready'
    rerender(<DisciplineTrackerPage />)
    expect(container.querySelector('[aria-live="polite"]')).toBeNull()
  })
  beforeEach(() => {
    mocks.tracker = createTracker()
    mocks.parseBackup.mockReset().mockReturnValue({ version: 1 })
  })

  it('manages the behavior and only permits marking the tenant current day', async () => {
    const user = userEvent.setup()
    render(<DisciplineTrackerPage />)

    expect(screen.getAllByText('75%')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /^Planejar o dia, dia 1:/ }).disabled).toBe(true)
    const today = screen.getByRole('button', { name: /^Planejar o dia, dia 6:/ })
    expect(today.disabled).toBe(false)
    await user.click(today)

    expect(mocks.tracker.cycleMark).toHaveBeenCalledWith(6, 'habit-1')
    await user.type(screen.getByPlaceholderText('O que aconteceu, sem desculpas e sem julgamento?'), 'Emergência familiar')
    await user.click(screen.getByRole('button', { name: 'Salvar causa' }))
    await waitFor(() => expect(mocks.tracker.saveJustification).toHaveBeenCalledWith('2026-09-06:habit-1', 'Emergência familiar'))

    const behavior = screen.getByLabelText('Comportamento Planejar o dia')
    await user.clear(behavior)
    await user.type(behavior, 'Revisar prioridades')
    fireEvent.blur(behavior)
    await user.click(screen.getByRole('button', { name: 'Remover Planejar o dia' }))
    expect(mocks.tracker.renameBehavior).toHaveBeenCalledWith('habit-1', 'Revisar prioridades')
    expect(mocks.tracker.removeBehavior).toHaveBeenCalledWith('habit-1')

    await user.type(screen.getByLabelText('Novo comportamento'), 'Registrar resultados')
    await user.click(screen.getByRole('button', { name: '+ Adicionar' }))
    expect(mocks.tracker.addBehavior).toHaveBeenCalledWith('Registrar resultados')
    expect(screen.getByLabelText('Novo comportamento').value).toBe('')
  })

  it('exports and restores a validated tracker backup', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tracker')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = render(<DisciplineTrackerPage />)

    await user.click(screen.getByRole('button', { name: 'Exportar backup' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('exportado com sucesso'))
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:tracker')

    const file = new File(['{}'], 'tracker.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('{}') })
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } })

    await waitFor(() => expect(mocks.tracker.restoreBackup).toHaveBeenCalledWith({ version: 1 }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toContain('restaurado com sucesso')

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    click.mockRestore()
    confirm.mockRestore()
  })

  it('shows synchronization failures and opens an existing justification', async () => {
    const user = userEvent.setup()
    const key = '2026-09-05:habit-1'
    mocks.tracker = createTracker({
      status: 'error',
      error: new Error('serviço indisponível'),
      state: {
        behaviors: [{ id: 'habit-1', name: 'Planejar o dia', active: true, order: 1 }],
        marks: { [key]: 2 },
        justifications: { [key]: 'Imprevisto' },
      },
    })
    render(<DisciplineTrackerPage />)

    expect(screen.getByRole('alert').textContent).toContain('serviço indisponível')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await user.click(screen.getByRole('button', { name: 'Editar Planejar o dia' }))

    expect(mocks.tracker.reload).toHaveBeenCalledOnce()
    expect(screen.getByDisplayValue('Imprevisto')).not.toBeNull()
  })
})
