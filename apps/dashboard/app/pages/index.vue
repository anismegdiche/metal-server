<script setup lang="ts">
const { data: metrics, refresh } = useFetch<Record<string, any>>('/api/metrics/server/server:~')

const uptimeSeconds = ref(0)

onMounted(() => {
    const pollInterval = setInterval(refresh, 5000)
    const uptimeInterval = setInterval(() => {
        if (metrics.value?.['server:uptime']) {
            uptimeSeconds.value = Math.floor((Date.now() - metrics.value['server:uptime']) / 1000)
        }
    }, 1000)
    onUnmounted(() => {
        clearInterval(pollInterval)
        clearInterval(uptimeInterval)
    })
})

const serverOnline = computed(() => !!metrics.value)

const formattedUptime = computed(() => {
    const s = uptimeSeconds.value
    const days = Math.floor(s / 86400)
    const hours = Math.floor((s % 86400) / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
})

const formattedMemory = computed(() => {
    const bytes = metrics.value?.['server:memory:usage'] ?? 0
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
})

const formattedCpu = computed(() => {
    const usage = metrics.value?.['server:cpu:usage'] ?? 0
    return `${Number(usage).toFixed(1)}%`
})

const systemStatus = ref({
    activePlans: 3,
    activeSchedules: 5,
    dataSources: 4,
    aiEngines: 2
})

const recentPlanRuns = [
    { plan: 'nightly-sync', status: 'completed', duration: '1m 24s', rows: 15420, time: '10min ago' },
    { plan: 'user-import', status: 'completed', duration: '32s', rows: 890, time: '1h ago' },
    { plan: 'data-cleanup', status: 'failed', duration: '12s', rows: 0, time: '3h ago' },
    { plan: 'report-gen', status: 'running', duration: '2m 10s', rows: 4300, time: 'now' },
    { plan: 'db-backup', status: 'completed', duration: '4m 5s', rows: 0, time: '6h ago' }
]

const systemMetrics = [
    { label: 'Plans Execution', value: '47', icon: 'i-lucide-play', color: 'primary' },
    { label: 'Rows Processed', value: '1.2M', icon: 'i-lucide-table', color: 'success' },
    { label: 'Error Rate', value: '2.3%', icon: 'i-lucide-alert-triangle', color: 'warning' },
    { label: 'Avg Duration', value: '18s', icon: 'i-lucide-clock', color: 'info' }
]
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold">
                    <UIcon name="i-lucide-layout-dashboard ml-0 mr-2" />Overview
                </h1>
                <p class="text-sm text-muted">Monitor your Metal Server health and activity</p>
            </div>
            <UBadge :color="serverOnline ? 'success' : 'error'" variant="subtle" size="lg">
                <template #leading>
                    <div class="size-1.5 rounded-full" :class="serverOnline ? 'bg-success' : 'bg-error'" />
                </template>
                {{ serverOnline ? 'Online' : 'Offline' }}
            </UBadge>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UCard v-for="metric in systemMetrics" :key="metric.label" class="bg-metal-gradient">
                <template #header>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-muted">{{ metric.label }}</span>
                        <UIcon :name="metric.icon" class="size-5" :class="`text-${metric.color}`" />
                    </div>
                </template>
                <p class="text-2xl font-bold">{{ metric.value }}</p>
            </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UCard class="lg:col-span-2 bg-metal-gradient">
                <template #header>
                    <div class="flex items-center justify-between">
                        <h2 class="font-semibold">Recent Plan Runs</h2>
                        <NuxtLink to="/plans" class="text-sm text-primary hover:underline">
                            View all
                        </NuxtLink>
                    </div>
                </template>
                <UTable :columns="[
                    { accessorKey: 'plan', header: 'Plan' },
                    { accessorKey: 'rows', header: 'Rows' },
                    { accessorKey: 'duration', header: 'Duration' },
                    { accessorKey: 'time', header: 'When' },
                    { accessorKey: 'status', header: 'Status' }
                ]" :data="recentPlanRuns">
                    <template #status-cell="{ row }">
                        <UBadge
                            :color="row.original.status === 'completed' ? 'success' : row.original.status === 'running' ? 'info' : 'error'"
                            variant="subtle" size="sm">
                            {{ row.original.status }}
                        </UBadge>
                    </template>
                </UTable>
            </UCard>

            <UCard class="bg-metal-gradient">
                <template #header>
                    <h2 class="font-semibold">System Info</h2>
                </template>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Version</span>
                        <span class="font-medium">{{ metrics?.['server:version'] ?? '—' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Uptime</span>
                        <span class="font-medium">{{ formattedUptime }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">CPU Usage</span>
                        <span class="font-medium">{{ formattedCpu }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Memory Usage</span>
                        <span class="font-medium">{{ formattedMemory }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Active Plans</span>
                        <span class="font-medium">{{ systemStatus.activePlans }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Schedules</span>
                        <span class="font-medium">{{ systemStatus.activeSchedules }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Data Sources</span>
                        <span class="font-medium">{{ systemStatus.dataSources }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">AI Engines</span>
                        <span class="font-medium">{{ systemStatus.aiEngines }}</span>
                    </div>
                </div>
            </UCard>
        </div>
    </div>
</template>
