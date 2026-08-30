export function SentryTestButton() {
  if (import.meta.env.DEV || !import.meta.env.VITE_SENTRY_DSN) return null

  return (
    <button
      className="sentry-test-button"
      type="button"
      onClick={() => {
        throw new Error('This is your first error!')
      }}
    >
      Break the world
    </button>
  )
}
