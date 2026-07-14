export function getChecklistStats(checklist = {}, totalItems = 0) {
  const checked = Object.values(checklist).filter(Boolean).length
  return {
    checked,
    total: totalItems,
    percent: totalItems ? Math.round((checked / totalItems) * 100) : 0,
    commandDay: totalItems > 0 && checked >= Math.min(10, totalItems),
    complete: totalItems > 0 && checked === totalItems,
  }
}
