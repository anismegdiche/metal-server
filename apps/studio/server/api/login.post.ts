interface LoginError {
  statusCode?: number
  status?: number
  statusMessage?: string
  data?: { error?: string, message?: string }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string, password?: string }>(event)

  if (!body?.username || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Missing username or password' })
  }

  const metalServerUrl = useRuntimeConfig(event).metalServerUrl as string

  let token: string
  try {
    const loginRes = await $fetch<{ token: string }>(`${metalServerUrl}/user/login`, {
      method: 'POST',
      body: { username: body.username, password: body.password }
    })
    token = loginRes.token
  } catch (e) {
    const err = e as LoginError
    throw createError({
      statusCode: err?.statusCode ?? err?.status ?? 401,
      statusMessage: err?.statusMessage ?? 'Unauthorized',
      message: err?.data?.error ?? err?.data?.message ?? 'Login failed. Check your credentials.'
    })
  }

  if (!token) {
    throw createError({ statusCode: 401, message: 'Login failed. Check your credentials.' })
  }

  let userInfo: { user: string, roles?: string[] } | null = null
  try {
    userInfo = await $fetch<{ user: string, roles?: string[] }>(`${metalServerUrl}/user/info`, {
      headers: { authorization: `Bearer ${token}` }
    })
  } catch {
    /* token remains valid for the session even if info fails */
  }

  await setUserSession(event, {
    user: {
      username: userInfo?.user ?? body.username,
      roles: userInfo?.roles ?? []
    },
    secure: {
      token
    }
  })

  return { ok: true }
})
