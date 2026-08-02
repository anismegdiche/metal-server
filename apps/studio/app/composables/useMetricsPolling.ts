export function useMetricsPolling(url: string, intervalMs = 5000) {
  const { data, refresh } = useFetch<Record<string, any>>(url, { server: false })

  onMounted(() => {
    const interval = setInterval(refresh, intervalMs)
    onUnmounted(() => clearInterval(interval))
  })

  return { data, refresh }
}

export function useMultiMetricsPolling(
  fetchers: Array<{ refresh: () => void }>,
  intervalMs = 5000,
) {
  onMounted(() => {
    const interval = setInterval(() => {
      for (const f of fetchers) f.refresh()
    }, intervalMs)
    onUnmounted(() => clearInterval(interval))
  })
}
