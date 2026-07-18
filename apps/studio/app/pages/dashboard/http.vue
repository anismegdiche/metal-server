<script setup lang="ts">
const { data: httpMetrics, refresh: refreshHttp } = useMetricsPolling('/server-api/metrics/http/http:%7E')

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
        <PageHeader icon="i-lucide-globe" title="HTTP" description="Monitor HTTP request activity and performance" />

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard v-for="card in httpMetricCards" :key="card.label" v-bind="card" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UCard class="bg-metal-gradient">
                <template #header>
                    <h2 class="font-semibold">Status Code Breakdown</h2>
                </template>
                <div class="flex flex-col gap-3">
                    <div v-for="status in statusBreakdown" :key="status.label" class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <UBadge :color="status.color" variant="subtle" size="md">{{ status.label }}</UBadge>
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
                    <InfoRow label="Total Requests" :value="totalRequests" />
                    <InfoRow label="Currently Active" :value="activeRequests" />
                    <InfoRow label="Avg Response Time" :value="`${avgDuration}ms`" />
                    <InfoRow label="Success Rate" :value="`${totalRequests > 0 ? ((count2xx / totalRequests) * 100).toFixed(1) : '0'}%`" />
                </div>
            </UCard>
        </div>
    </div>
</template>
