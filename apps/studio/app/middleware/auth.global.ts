export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (to.path === '/login') {
    if (loggedIn.value) return navigateTo('/dashboard')
    return
  }

  if (!loggedIn.value) return navigateTo('/login')
  if (to.path === '/') return navigateTo('/dashboard')
})
