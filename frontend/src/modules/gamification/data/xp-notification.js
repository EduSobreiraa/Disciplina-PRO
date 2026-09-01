export function getXpIncrease(previousBalance, nextBalance) {
  if (!Number.isFinite(previousBalance) || !Number.isFinite(nextBalance)) return 0
  return Math.max(0, nextBalance - previousBalance)
}
