<script setup lang="ts">
const { formatDuration, formatRelativeTime, formatMemory, formatUptime, getStatusColor } = useFormatting()

const { data: serverMetrics, refresh: refreshServer } = useMetricsPolling('/server-api/metrics/server/server:%7E')
const { data: planMetrics, refresh: refreshPlans } = useMetricsPolling('/server-api/metrics/plan:/plan:%7E')
const { data: plansSummary, refresh: refreshPlansSummary } = useMetricsPolling('/server-api/metrics/plans:/plans:%7E')
const { data: httpMetrics, refresh: refreshHttp } = useMetricsPolling('/server-api/metrics/http/http:%7E')
const { data: sourcesMetrics, refresh: refreshSources } = useMetricsPolling('/server-api/metrics/sources/sources:%7E')
const { data: schedulesMetrics, refresh: refreshSchedules } = useMetricsPolling('/server-api/metrics/schedules/schedules:%7E')

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

const formattedUptime = computed(() => formatUptime(uptimeSeconds.value))
const formattedMemory = computed(() => formatMemory(serverMetrics.value?.['server:memory:usage'] ?? 0))
const formattedCpu = computed(() => `${Number(serverMetrics.value?.['server:cpu:usage'] ?? 0).toFixed(1)}%`)

const systemStatus = computed(() => ({
    plans_total: plansSummary.value?.['plans:total'] ?? 0,
    schemas: 3,
}))

const totalRowsProcessed = computed(() => {
    if (!planMetrics.value) return 0
    return Object.entries(planMetrics.value)
        .filter(([key]) => key.startsWith('plan:'))
        .reduce((sum, [, plan]: [string, any]) => sum + (plan.totalRows ?? 0), 0)
})

const recentPlanRuns = computed(() => {
    now.value
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
</script>

<template>
    <div class="flex flex-col gap-6 p-0">
        <div class="flex items-center justify-between">
            <PageHeader icon="i-lucide-layout-dashboard" title="Dashboard" description="Monitor your Metal Server health and activity" />
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
                    <InfoRow label="Total Requests" :value="httpMetrics?.['http:requests:total'] ?? '-'" />
                    <InfoRow label="Active Requests" :value="httpMetrics?.['http:requests:active'] ?? '-'" />
                    <InfoRow label="Avg Duration" :value="`${httpMetrics?.['http:requests:avg_duration'] ?? '-'}ms`" />
                    <InfoRow label="Errors (4xx/5xx)" :value="(httpMetrics?.['http:requests:4xx'] ?? 0) + (httpMetrics?.['http:requests:5xx'] ?? 0)" />
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
                    <InfoRow label="Total Sources" :value="sourcesMetrics?.['sources:total'] ?? '-'" />
                    <InfoRow label="Active Connections" :value="sourcesMetrics?.['sources:active'] ?? '-'" />
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
                    <InfoRow label="Active Plans" :value="plansSummary?.['plans:active'] ?? '-'" />
                    <InfoRow label="Total Executions" :value="plansSummary?.['plans:execution'] ?? '-'" />
                    <InfoRow label="Rows Processed" :value="totalRowsProcessed" />
                    <InfoRow label="Error Rate" value="—" />
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
                    <InfoRow label="Total Schedules" :value="schedulesMetrics?.['schedules:total'] ?? '-'" />
                    <InfoRow label="Active Jobs" :value="schedulesMetrics?.['schedules:active'] ?? '-'" />
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
                        <StatusBadge :status="row.original.status" />
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
                        <InfoRow label="Version" :value="serverMetrics?.['server:version'] ?? '—'" />
                        <InfoRow label="Uptime" :value="formattedUptime" />
                        <InfoRow label="CPU Usage" :value="formattedCpu" />
                        <InfoRow label="Memory Usage" :value="formattedMemory" />
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
                        <InfoRow label="Schemas" :value="systemStatus.schemas" />
                        <InfoRow label="Plans" :value="systemStatus.plans_total" />
                    </div>
                </UCard>
            </div>
        </div>
    </div>
</template>
