export default defineNitroPlugin(() => {
  sessionHooks.hook('clear', async (session) => {
    const token = session?.secure?.token
    if (!token) return

    const serverAddress = useRuntimeConfig().serverAddress as string
    await $fetch(`${serverAddress}/user/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` }
    }).catch(() => {
      /* ignore logout errors, session is cleared regardless */
    })
  })
})
