<script setup lang="ts">
const logs = ref([
  { id: '1', timestamp: '2025-07-17 14:32:01', level: 'info', message: 'Server started on port 3000', source: 'server' },
  { id: '2', timestamp: '2025-07-17 14:32:02', level: 'info', message: 'Connected to PostgreSQL', source: 'source' },
  { id: '3', timestamp: '2025-07-17 14:32:03', level: 'info', message: 'Connected to MySQL', source: 'source' },
  { id: '4', timestamp: '2025-07-17 14:35:15', level: 'warn', message: 'Slow query detected: 2.3s', source: 'plan' },
  { id: '5', timestamp: '2025-07-17 14:40:22', level: 'error', message: 'Connection refused to Redis', source: 'source' },
  { id: '6', timestamp: '2025-07-17 14:45:30', level: 'info', message: 'Plan "Import Users" completed', source: 'plan' },
  { id: '7', timestamp: '2025-07-17 14:50:45', level: 'debug', message: 'Cache hit for key: users:list', source: 'cache' },
  { id: '8', timestamp: '2025-07-17 14:55:01', level: 'info', message: 'Schedule "Sync Inventory" triggered', source: 'schedule' },
])

const filterLevel = ref('all')
const filterSource = ref('all')

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    if (filterLevel.value !== 'all' && log.level !== filterLevel.value) return false
    if (filterSource.value !== 'all' && log.source !== filterSource.value) return false
    return true
  })
})

const levelColor: Record<string, string> = {
  info: 'text-success',
  warn: 'text-warning',
  error: 'text-error',
  debug: 'text-muted',
}

const sourceBadgeClass: Record<string, string> = {
  server: 'bg-info/10 text-info',
  source: 'bg-warning/10 text-warning',
  plan: 'bg-success/10 text-success',
  cache: 'bg-muted/10 text-muted',
  schedule: 'bg-primary/10 text-primary',
}

const levelItems = [
  { label: 'All Levels', value: 'all' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' },
  { label: 'Debug', value: 'debug' },
]

const sourceItems = [
  { label: 'All Sources', value: 'all' },
  { label: 'Server', value: 'server' },
  { label: 'Source', value: 'source' },
  { label: 'Plan', value: 'plan' },
  { label: 'Cache', value: 'cache' },
  { label: 'Schedule', value: 'schedule' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold"><UIcon name="i-lucide-scroll-text" class="ml-0 mr-2" />Logs</h1>
        <p class="text-sm text-muted">Server logs and activity</p>
      </div>
      <div class="flex gap-2">
        <USelect v-model="filterLevel" :items="levelItems" size="xs" />
        <USelect v-model="filterSource" :items="sourceItems" size="xs" />
      </div>
    </div>

    <UCard class="bg-metal-gradient">
      <div class="flex flex-col font-mono text-xs">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="flex items-start gap-3 py-1.5 border-b border-default/50 last:border-0"
        >
          <span class="text-muted whitespace-nowrap">{{ log.timestamp }}</span>
          <span class="w-12 font-semibold uppercase" :class="levelColor[log.level]">{{ log.level }}</span>
          <span class="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded" :class="sourceBadgeClass[log.source]">
            {{ log.source }}
          </span>
          <span class="flex-1">{{ log.message }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
