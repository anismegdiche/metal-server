<script setup lang="ts">
const { data: serverMetrics, refresh: refreshServer } = useFetch<Record<string, any>>('/server-api/metrics/server/server:%7E')
const { data: planMetrics, refresh: refreshPlans } = useFetch<Record<string, any>>('/server-api/metrics/plan:/plan:%7E')
const { data: plansSummary, refresh: refreshPlansSummary } = useFetch<Record<string, any>>('/server-api/metrics/plans:/plans:%7E')
const { data: httpMetrics, refresh: refreshHttp } = useFetch<Record<string, any>>('/server-api/metrics/http/http:%7E')
const { data: sourcesMetrics, refresh: refreshSources } = useFetch<Record<string, any>>('/server-api/metrics/sources/sources:%7E')
const { data: schedulesMetrics, refresh: refreshSchedules } = useFetch<Record<string, any>>('/server-api/metrics/schedules/schedules:%7E')

const now = ref(Date.now())
const uptimeSeconds = ref(0)

onMounted(() => {
    const pollInterval = setInterval(() => {
        refreshServer()
        refreshPlans()
        refreshPlansSummary()
        refreshHttp()
        refreshSources()
        refreshSchedules()
    }, 5000)
    const tickInterval = setInterval(() => {
        now.value = Date.now()
        if (serverMetrics.value?.['server:uptime']) {
            uptimeSeconds.value = Math.floor((now.value - serverMetrics.value['server:uptime']) / 1000)
        }
    }, 1000)
    onUnmounted(() => {
        clearInterval(pollInterval)
        clearInterval(tickInterval)
    })
})

const serverOnline = computed(() => !!serverMetrics.value)

const formattedUptime = computed(() => {
    const s = uptimeSeconds.value
    const days = Math.floor(s / 86400)
    const hours = Math.floor((s % 86400) / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
})

const formattedMemory = computed(() => {
    const bytes = serverMetrics.value?.['server:memory:usage'] ?? 0
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
})

const formattedCpu = computed(() => {
    const usage = serverMetrics.value?.['server:cpu:usage'] ?? 0
    return `${Number(usage).toFixed(1)}%`
})

const systemStatus = computed(() => ({
    plans_total: plansSummary.value?.['plans:total'] ?? 0,
    schemas: 3,
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
            rows: plan.totalRows ?? 0,
            time: plan.endTime ? formatRelativeTime(plan.endTime) : 'now',
            _endTime: new Date(plan.endTime ?? 0).getTime()
        }))
        .sort((a, b) => b._endTime - a._endTime)
        .map(({ _endTime, ...rest }) => rest)
})

const totalRowsProcessed = computed(() => {
    if (!planMetrics.value) return 0
    return Object.entries(planMetrics.value)
        .filter(([key]) => key.startsWith('plan:'))
        .reduce((sum, [, plan]: [string, any]) => sum + (plan.totalRows ?? 0), 0)
})
</script>

<template>
    <div class="flex flex-col gap-6 p-0">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold">
                    <UIcon name="i-lucide-layout-dashboard" class="ml-0 mr-2" />Dashboard
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
            <UCard class="bg-metal-gradient">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-globe" class="size-5 text-info" />
                        <h2 class="font-semibold">HTTP</h2>
                    </div>
                </template>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Total Requests</span>
                        <span class="font-medium">{{ httpMetrics?.['http:requests:total'] ?? '-' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Active Requests</span>
                        <span class="font-medium">{{ httpMetrics?.['http:requests:active'] ?? '-' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Avg Duration</span>
                        <span class="font-medium">{{ httpMetrics?.['http:requests:avg_duration'] ?? '-' }}ms</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Errors (4xx/5xx)</span>
                        <span class="font-medium">{{ (httpMetrics?.['http:requests:4xx'] ?? 0) + (httpMetrics?.['http:requests:5xx'] ?? 0) }}</span>
                    </div>
                </div>
            </UCard>

            <UCard class="bg-metal-gradient">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-plug" class="size-5 text-warning" />
                        <h2 class="font-semibold">Sources</h2>
                    </div>
                </template>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Total Sources</span>
                        <span class="font-medium">{{ sourcesMetrics?.['sources:total'] ?? '-' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Active Connections</span>
                        <span class="font-medium">{{ sourcesMetrics?.['sources:active'] ?? '-' }}</span>
                    </div>
                </div>
            </UCard>

            <UCard class="bg-metal-gradient">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-workflow" class="size-5 text-success" />
                        <h2 class="font-semibold">Plans</h2>
                    </div>
                </template>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Active Plans</span>
                        <span class="font-medium">{{ plansSummary?.['plans:active'] ?? '-' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Total Executions</span>
                        <span class="font-medium">{{ plansSummary?.['plans:execution'] ?? '-' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Rows Processed</span>
                        <span class="font-medium">{{ totalRowsProcessed }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Error Rate</span>
                        <span class="font-medium">—</span>
                    </div>
                </div>
            </UCard>

            <UCard class="bg-metal-gradient">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-calendar-clock" class="size-5 text-primary" />
                        <h2 class="font-semibold">Schedules</h2>
                    </div>
                </template>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Total Schedules</span>
                        <span class="font-medium">{{ schedulesMetrics?.['schedules:total'] ?? '-' }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Active Jobs</span>
                        <span class="font-medium">{{ schedulesMetrics?.['schedules:active'] ?? '-' }}</span>
                    </div>
                </div>
            </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UCard class="lg:col-span-2 bg-metal-gradient">
                <template #header>
                    <div class="flex items-center justify-between">
                        <h2 class="font-semibold">Recent Plan Runs</h2>
                        <NuxtLink to="/dashboard/plans" class="text-sm text-primary hover:underline">
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
                            variant="subtle" size="md">
                            {{ row.original.status }}
                        </UBadge>
                    </template>
                </UTable>
            </UCard>

            <div class="flex flex-col gap-4">
                <UCard class="bg-metal-gradient">
                    <template #header>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-server" class="size-5 text-primary" />
                            <h2 class="font-semibold">System Info</h2>
                        </div>
                    </template>
                    <div class="flex flex-col gap-3">
                        <div class="flex justify-between text-sm">
                            <span class="text-muted">Version</span>
                            <span class="font-medium">{{ serverMetrics?.['server:version'] ?? '—' }}</span>
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
                    </div>
                </UCard>

                <UCard class="bg-metal-gradient">
                    <template #header>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-layers" class="size-5 text-warning" />
                            <h2 class="font-semibold">Resources</h2>
                        </div>
                    </template>
                    <div class="flex flex-col gap-3">
                        <div class="flex justify-between text-sm">
                            <span class="text-muted">Schemas</span>
                            <span class="font-medium">{{ systemStatus.schemas }}</span>
                        </div>
                        <USeparator />
                        <div class="flex justify-between text-sm">
                            <span class="text-muted">Plans</span>
                            <span class="font-medium">{{ systemStatus.plans_total }}</span>
                        </div>
                    </div>
                </UCard>
            </div>
        </div>
    </div>
</template>
