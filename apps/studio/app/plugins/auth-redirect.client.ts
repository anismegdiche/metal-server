import type { FetchContext } from 'ofetch'

export default defineNuxtPlugin(() => {
  const { clear, session } = useUserSession()

  const originalFetch = globalThis.$fetch

  let redirecting = false
  async function handleUnauthorized() {
    if (redirecting) return
    redirecting = true
    try {
      await clear().catch(() => {})
      session.value = null
      if (window.location.pathname !== '/login') {
        await navigateTo('/login')
      }
    } finally {
      redirecting = false
    }
  }

  globalThis.$fetch = originalFetch.create({
    onResponseError: async (ctx: FetchContext) => {
      if (ctx.response?.status === 401 && String(ctx.request).startsWith('/server-api')) {
        await handleUnauthorized()
      }
    }
  })
})
