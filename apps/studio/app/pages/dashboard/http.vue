<script setup lang="ts">

const { data: httpMetrics, refresh: refreshHttp } = useFetch<Record<string, any>>('/server-api/metrics/http/http:%7E')

onMounted(() => {
    const interval = setInterval(refreshHttp, 5000)
    onUnmounted(() => clearInterval(interval))
})

const totalRequests = computed(() => httpMetrics.value?.['http:requests:total'] ?? 0)
const activeRequests = computed(() => httpMetrics.value?.['http:requests:active'] ?? 0)
const count2xx = computed(() => httpMetrics.value?.['http:requests:2xx'] ?? 0)
const count3xx = computed(() => httpMetrics.value?.['http:requests:3xx'] ?? 0)
const count4xx = computed(() => httpMetrics.value?.['http:requests:4xx'] ?? 0)
const count5xx = computed(() => httpMetrics.value?.['http:requests:5xx'] ?? 0)
const avgDuration = computed(() => httpMetrics.value?.['http:requests:avg_duration'] ?? 0)

const httpMetricCards = computed(() => [
    { label: 'Total Requests', value: totalRequests.value, icon: 'i-lucide-globe', iconClass: 'text-primary' },
    { label: 'Active', value: activeRequests.value, icon: 'i-lucide-zap', iconClass: 'text-success' },
    { label: 'Avg Duration', value: `${avgDuration.value}ms`, icon: 'i-lucide-clock', iconClass: 'text-info' },
    { label: 'Errors', value: count4xx.value + count5xx.value, icon: 'i-lucide-alert-triangle', iconClass: 'text-warning' }
])

const statusBreakdown = computed(() => [
    { label: '2xx Success', value: count2xx.value, color: 'success' as const },
    { label: '3xx Redirect', value: count3xx.value, color: 'info' as const },
    { label: '4xx Client Error', value: count4xx.value, color: 'warning' as const },
    { label: '5xx Server Error', value: count5xx.value, color: 'error' as const },
])
</script>

<template>
    <div class="flex flex-col gap-6 p-0">
        <div>
            <h1 class="text-2xl font-bold">
                <UIcon name="i-lucide-globe" class="ml-0 mr-2" />HTTP
            </h1>
            <p class="text-sm text-muted">Monitor HTTP request activity and performance</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UCard v-for="card in httpMetricCards" :key="card.label" class="bg-metal-gradient">
                <div class="flex items-center gap-3">
                    <UIcon :name="card.icon" class="size-12" :class="card.iconClass" />
                    <div>
                        <p class="text-2xl font-bold">{{ card.value }}</p>
                        <p class="text-xs text-muted">{{ card.label }}</p>
                    </div>
                </div>
            </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UCard class="bg-metal-gradient">
                <template #header>
                    <h2 class="font-semibold">Status Code Breakdown</h2>
                </template>
                <div class="flex flex-col gap-3">
                    <div v-for="status in statusBreakdown" :key="status.label" class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <UBadge :color="status.color" variant="subtle" size="sm">{{ status.label }}</UBadge>
                        </div>
                        <span class="font-medium">{{ status.value }}</span>
                    </div>
                </div>
            </UCard>

            <UCard class="bg-metal-gradient">
                <template #header>
                    <h2 class="font-semibold">Request Details</h2>
                </template>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Total Requests</span>
                        <span class="font-medium">{{ totalRequests }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Currently Active</span>
                        <span class="font-medium">{{ activeRequests }}</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Avg Response Time</span>
                        <span class="font-medium">{{ avgDuration }}ms</span>
                    </div>
                    <USeparator />
                    <div class="flex justify-between text-sm">
                        <span class="text-muted">Success Rate</span>
                        <span class="font-medium">{{ totalRequests > 0 ? ((count2xx / totalRequests) * 100).toFixed(1) : '0' }}%</span>
                    </div>
                </div>
            </UCard>
        </div>
    </div>
</template>
