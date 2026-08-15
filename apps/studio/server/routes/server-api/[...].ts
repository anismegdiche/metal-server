export default defineEventHandler(async (event) => {
  const serverAddress = useRuntimeConfig(event).serverAddress as string
  const url = getRequestURL(event)
  const path = url.pathname.replace(/^\/server-api/, '') || '/'
  const target = `${serverAddress}${path}${url.search}`

  const session = await getUserSession(event)
  const token = session?.secure?.token

  return proxyRequest(event, target, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    onResponse: async (_event, response) => {
      if (response.status === 401) {
        await clearUserSession(event).catch(() => {})
      }
    }
  })
})
