export function getScore(record) {
  const score = Number(record?.score ?? record?.placar)
  return Number.isFinite(score) ? score : null
}

export function getScoreStats(dailyRecords = {}) {
  const records = Object.entries(dailyRecords)
    .map(([day, record]) => ({ day: Number(day), score: getScore(record) }))
    .filter((record) => Number.isInteger(record.day) && record.score !== null)
    .sort((a, b) => a.day - b.day)

  if (!records.length) return { records, averageLast7: null, best: null, last: null }
  const last7 = records.slice(-7)
  const averageLast7 = Math.round((last7.reduce((total, record) => total + record.score, 0) / last7.length) * 10) / 10
  const best = records.reduce((winner, record) => record.score > winner.score ? record : winner)
  return { records, averageLast7, best, last: records.at(-1) }
}

export function getHeatLevel(score) {
  if (score === null || score === undefined) return 'pending'
  if (score < 24) return 'low'
  if (score < 42) return 'medium'
  return 'high'
}

export function calculatePillarScore(pillars = {}) {
  return Object.values(pillars).reduce((total, value) => total + Math.min(10, Math.max(0, Number(value) || 0)), 0)
}
