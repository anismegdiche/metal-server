export default defineEventHandler(async (event) => {
  const metalServerUrl = useRuntimeConfig(event).metalServerUrl as string
  const url = getRequestURL(event)
  const path = url.pathname.replace(/^\/server-api/, '') || '/'
  const target = `${metalServerUrl}${path}${url.search}`

  const session = await getUserSession(event)
  const token = session?.secure?.token

  return proxyRequest(event, target, {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  })
})
