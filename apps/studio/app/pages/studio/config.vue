<script setup lang="ts">

const { data: serverInfo, refresh } = useFetch<Record<string, any>>('/server-api/server/info')

onMounted(() => {
  const interval = setInterval(refresh, 10000)
  onUnmounted(() => clearInterval(interval))
})

const sections = computed(() => {
  if (!serverInfo.value) return []
  const info = serverInfo.value
  return [
    {
      title: 'Server',
      items: [
        { label: 'Version', value: info.version ?? '—' },
        { label: 'Platform', value: `${info.platform ?? '—'} ${info.arch ?? ''}` },
        { label: 'Node.js', value: info.nodeVersion ?? '—' },
        { label: 'Uptime', value: info.uptime ?? '—' },
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Hostname', value: info.hostname ?? '—' },
        { label: 'CPU Cores', value: info.cpus ?? '—' },
        { label: 'Total Memory', value: info.totalMemory ?? '—' },
        { label: 'Free Memory', value: info.freeMemory ?? '—' },
      ]
    },
    {
      title: 'Config',
      items: [
        { label: 'Port', value: info.port ?? '—' },
        { label: 'Authentication', value: info.authentication ? 'Enabled' : 'Disabled' },
        { label: 'Timezone', value: info.timezone ?? '—' },
        { label: 'Response Chunk', value: info.responseChunk ? 'Enabled' : 'Disabled' },
      ]
    }
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-server" class="ml-0 mr-2" />Server Info</h1>
      <p class="text-sm text-muted">Server configuration and system information</p>
    </div>

    <div v-if="serverInfo" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard v-for="section in sections" :key="section.title">
        <template #header>
          <h3 class="font-semibold text-sm">{{ section.title }}</h3>
        </template>
        <div class="flex flex-col gap-2">
          <div v-for="item in section.items" :key="item.label" class="flex items-center justify-between">
            <span class="text-xs text-muted">{{ item.label }}</span>
            <span class="text-sm font-mono">{{ item.value }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <p class="text-sm text-muted">Loading server info...</p>
    </UCard>
  </div>
</template>
