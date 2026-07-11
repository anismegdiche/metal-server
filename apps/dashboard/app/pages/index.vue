<script setup lang="ts">
const { data: serverInfo, refresh: refreshInfo } = useFetch<Record<string, any>>('/server-api/server/info')
const { data: metrics, refresh: refreshServer } = useFetch<Record<string, any>>('/server-api/metrics/server/server:~')
const { data: planMetrics, refresh: refreshPlans } = useFetch<Record<string, any>>('/server-api/metrics/plan:/plan:~')
const { data: plansSummary, refresh: refreshPlansSummary } = useFetch<Record<string, any>>('/server-api/metrics/plans:/plans:~')

const now = ref(Date.now())
const uptimeSeconds = ref(0)

onMounted(() => {
    const pollInterval = setInterval(() => {
        refreshInfo()
        refreshServer()
        refreshPlans()
        refreshPlansSummary()
    }, 5000)
    const tickInterval = setInterval(() => {
        now.value = Date.now()
        if (metrics.value?.['server:uptime']) {
            uptimeSeconds.value = Math.floor((now.value - metrics.value['server:uptime']) / 1000)
        }
    }, 1000)
    onUnmounted(() => {
        clearInterval(pollInterval)
        clearInterval(tickInterval)
    })
})

const serverOnline = computed(() => !!serverInfo.value)

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

const systemStatus = computed(() => ({
    activePlans: plansSummary.value?.['plans:active'] ?? 0,
    activeSchedules: 5,
    dataSources: 4,
    aiEngines: 2
}))

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    const totalSeconds = Math.floor(ms / 1000)
    if (totalSeconds < 60) return `${totalSeconds}s`
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds}s`
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

const recentPlanRuns = computed(() => {
    now.value // trigger reactivity for live relative time
    if (!planMetrics.value) return []
    return Object.entries(planMetrics.value)
        .filter(([key]) => key.startsWith('plan:'))
        .map(([key, plan]: [string, any]) => ({
            plan: plan.planName ?? key.replace('plan:', ''),
            status: plan.status ?? 'unknown',
            duration: formatDuration(plan.durationMs ?? 0),
            rows: '—',
            time: plan.endTime ? formatRelativeTime(plan.endTime) : 'now',
            _endTime: new Date(plan.endTime ?? 0).getTime()
        }))
        .sort((a, b) => b._endTime - a._endTime)
        .map(({ _endTime, ...rest }) => rest)
})

const systemMetrics = computed(() => [
    { label: 'Plans Execution', value: String(plansSummary.value?.['plans:execution'] ?? 0), icon: 'i-lucide-play', color: 'primary' },
    { label: 'Rows Processed', value: '1.2M', icon: 'i-lucide-table', color: 'success' },
    { label: 'Error Rate', value: '2.3%', icon: 'i-lucide-alert-triangle', color: 'warning' },
    { label: 'Avg Duration', value: '18s', icon: 'i-lucide-clock', color: 'info' }
])
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
