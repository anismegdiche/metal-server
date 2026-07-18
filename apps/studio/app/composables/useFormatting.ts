export function useFormatting() {
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds}s`
  }

  function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString()
  }

  function formatTime(iso: string | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString()
  }

  function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  function formatMemory(bytes: number): string {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  function errorPercent(errors: number, total: number): string {
    if (total === 0) return '0%'
    return ((errors / total) * 100).toFixed(1) + '%'
  }

  function getStatusColor(status: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
    if (status === 'completed' || status === 'success' || status === 'connected' || status === 'active' || status === 'healthy') return 'success'
    if (status === 'running') return 'info'
    if (status === 'failed' || status === 'error' || status === 'disconnected' || status === 'down') return 'error'
    if (status === 'degraded' || status === 'paused') return 'warning'
    return 'neutral'
  }

  return {
    formatDuration,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    formatNumber,
    formatMemory,
    formatUptime,
    errorPercent,
    getStatusColor,
  }
}
