<script setup lang="ts">
const { data: serverInfo, refresh } = useMetricsPolling('/server-api/server/info', 10000)

const sections = computed(() => {
  if (!serverInfo.value) return []
  const info = serverInfo.value
  return [
    {
      title: 'Server',
      items: [
        { label: 'Version', value: info.version ?? '\u2014' },
        { label: 'Platform', value: `${info.platform ?? '\u2014'} ${info.arch ?? ''}` },
        { label: 'Node.js', value: info.nodeVersion ?? '\u2014' },
        { label: 'Uptime', value: info.uptime ?? '\u2014' },
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Hostname', value: info.hostname ?? '\u2014' },
        { label: 'CPU Cores', value: info.cpus ?? '\u2014' },
        { label: 'Total Memory', value: info.totalMemory ?? '\u2014' },
        { label: 'Free Memory', value: info.freeMemory ?? '\u2014' },
      ]
    },
    {
      title: 'Config',
      items: [
        { label: 'Port', value: info.port ?? '\u2014' },
        { label: 'Authentication', value: info.authentication ? 'Enabled' : 'Disabled' },
        { label: 'Timezone', value: info.timezone ?? '\u2014' },
        { label: 'Response Chunk', value: info.responseChunk ? 'Enabled' : 'Disabled' },
      ]
    }
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader icon="i-lucide-server" title="Server Info" description="Server configuration and system information" />

    <div v-if="serverInfo" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard class="bg-metal-gradient" v-for="section in sections" :key="section.title">
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

    <UCard class="bg-metal-gradient" v-else>
      <p class="text-sm text-muted">Loading server info...</p>
    </UCard>
  </div>
</template>
