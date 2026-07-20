<script setup lang="ts">
const logs = ref<Array<{ id: string, timestamp: string, level: string, message: string, source: string }>>([])
const meta = ref<{ total: number, limit: number, offset?: number, start: string, end: string, reverse: boolean } | null>(null)
const filterLevel = ref('all')
const search = ref('')
const page = ref(1)
const pageSize = ref(50)

const showClearModal = ref(false)
const clearing = ref(false)

const pageSizeItems = [
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '200', value: 200 },
]

const levelItems = [
  { label: 'All Levels', value: 'all' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' },
  { label: 'Debug', value: 'debug' },
]

const autoRefresh = ref(false)

async function fetchLogs() {
  try {
    const res = await $fetch<{ data: Array<{ id: string, timestamp: string, level: string, message: string, source: string }>, meta: { total: number, limit: number, offset?: number, start: string, end: string, reverse: boolean } }>(`/server-api/api/logs/*/*/${pageSize.value}/*/true`)
    logs.value = res.data
    meta.value = res.meta
  } catch {
    logs.value = []
    meta.value = null
  }
}

await fetchLogs()

let refreshInterval: ReturnType<typeof setInterval> | null = null

watch(autoRefresh, (enabled) => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (enabled) {
    refreshInterval = setInterval(fetchLogs, 5000)
  }
})

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    if (filterLevel.value !== 'all' && log.level !== filterLevel.value) return false
    if (search.value && !log.message.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize.value)))

const paginatedLogs = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredLogs.value.slice(start, start + pageSize.value)
})

watch([filterLevel, search], () => {
  page.value = 1
})

watch(pageSize, () => {
  page.value = 1
  fetchLogs()
})

const levelColor: Record<string, string> = {
  info: 'info',
  warn: 'warning',
  error: 'error',
  debug: 'success',
  trace: 'neutral',
}

const columns = [
  { accessorKey: 'timestamp', header: 'Time' },
  { accessorKey: 'level', header: 'Level' },
  { accessorKey: 'message', header: 'Message' },
]

async function clearLogs() {
  clearing.value = true
  try {
    await $fetch('/server-api/api/logs', { method: 'DELETE' })
    logs.value = []
    meta.value = null
    showClearModal.value = false
  } catch {
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader icon="i-lucide-scroll-text" title="Logs" description="Server logs and activity" />

    <div class="flex items-center gap-2">
      <UInput v-model="search" placeholder="Search logs..." icon="i-lucide-search" size="xs" class="w-64" />
      <USelect v-model="filterLevel" :items="levelItems" size="xs" />
      <div class="flex-1" />
      <USelect v-model="pageSize" :items="pageSizeItems" size="xs" />
      <span class="text-xs text-muted">{{ meta?.total ?? 0 }} entries</span>
      <USwitch v-model="autoRefresh" size="xs" label="Auto-refresh" />
      <UButton icon="i-lucide-refresh-cw" size="xs" variant="outline" @click="fetchLogs" />
      <UButton icon="i-lucide-trash-2" size="xs" variant="outline" color="error" label="Clear"
        @click="showClearModal = true" />
    </div>

    <UCard class="bg-metal-gradient">
      <UTable :columns="columns" :data="paginatedLogs" :ui="{
        th: 'px-2 py-1',
        td: 'px-2 py-1 align-top'
      }">
        <template #timestamp-cell="{ row }">
          <span class="text-muted whitespace-nowrap font-mono text-xs">{{ row.original.timestamp }}</span>
        </template>
        <template #level-cell="{ row }">
          <UBadge :color="levelColor[row.original.level] ?? 'neutral'" variant="subtle" size="sm">
            {{ row.original.level }}
          </UBadge>
        </template>
        <template #message-cell="{ row }">
          <span class="font-mono text-xs whitespace-normal wrap-break-words">{{ row.original.message }}</span>
        </template>
      </UTable>
    </UCard>

    <div v-if="totalPages > 1" class="flex justify-center">
      <UPagination v-model:page="page" :page-count="pageSize" :total="filteredLogs.length" size="xs" />
    </div>

    <UModal v-model:open="showClearModal">
      <template #content>
        <div class="p-4 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-full bg-error/10">
              <UIcon name="i-lucide-alert-triangle" class="size-5 text-error" />
            </div>
            <div>
              <h2 class="font-semibold">Clear All Logs</h2>
              <p class="text-sm text-muted">This will permanently delete all log entries. This action cannot be undone.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" variant="ghost" @click="showClearModal = false" />
            <UButton label="Clear Logs" color="error" :loading="clearing" @click="clearLogs" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
