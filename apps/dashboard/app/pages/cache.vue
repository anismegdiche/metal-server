<script setup lang="ts">
const cacheStats = ref({
  entries: 2847,
  memoryEstimate: '~12.4 MB',
  hitRate: 94.2,
  missRate: 5.8,
  ttl: '3600s',
  oldestEntry: '2026-07-06T10:00:00Z',
  newestEntry: '2026-07-07T19:02:00Z',
  hitRateHistory: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [91, 93, 92, 95, 94, 96, 94]
  }
})

const recentEntries = ref([
  { key: 'sha512:a1b2c3d4e5f6...', entity: 'users', created: '2026-07-07T19:02:00Z', ttl: '3600s', size: '1.2 KB' },
  { key: 'sha512:9f8e7d6c5b4a...', entity: 'orders', created: '2026-07-07T19:00:00Z', ttl: '1200s', size: '4.5 KB' },
  { key: 'sha512:0a1b2c3d4e5f...', entity: 'products', created: '2026-07-07T18:55:00Z', ttl: '3600s', size: '8.7 KB' },
  { key: 'sha512:f6e5d4c3b2a1...', entity: 'analytics', created: '2026-07-07T18:30:00Z', ttl: '1800s', size: '15.2 KB' },
  { key: 'sha512:8a7b6c5d4e3f...', entity: 'inventory', created: '2026-07-07T18:00:00Z', ttl: '600s', size: '3.1 KB' }
])

const columns = [
  { accessorKey: 'key', header: 'Key' },
  { accessorKey: 'entity', header: 'Entity' },
  { accessorKey: 'created', header: 'Created' },
  { accessorKey: 'ttl', header: 'TTL' },
  { accessorKey: 'size', header: 'Size' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-zap ml-0 mr-2" />Cache</h1>
      <p class="text-sm text-muted">Response cache layer overview and management</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Total Entries</span>
            <UIcon name="i-lucide-database" class="size-4 text-primary" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ cacheStats.entries.toLocaleString() }}</p>
      </UCard>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Memory</span>
            <UIcon name="i-lucide-hard-drive" class="size-4 text-warning" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ cacheStats.memoryEstimate }}</p>
      </UCard>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Hit Rate</span>
            <UIcon name="i-lucide-check-circle" class="size-4 text-success" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ cacheStats.hitRate }}%</p>
      </UCard>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Miss Rate</span>
            <UIcon name="i-lucide-x-circle" class="size-4 text-error" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ cacheStats.missRate }}%</p>
      </UCard>
    </div>

    <div class="flex gap-2">
      <UButton color="warning" variant="subtle" icon="i-lucide-refresh-cw">
        Clean Expired
      </UButton>
      <UButton color="error" variant="subtle" icon="i-lucide-trash-2">
        Purge All
      </UButton>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">Recent Cache Entries</h2>
      </template>
      <UTable :columns="columns" :data="recentEntries">
        <template #created-cell="{ row }">
          <span class="text-sm">{{ new Date(row.original.created).toLocaleString() }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
