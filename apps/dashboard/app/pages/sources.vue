<script setup lang="ts">
const sources = ref([
  { name: 'production-pg', type: 'PostgreSQL', typeIcon: 'i-lucide-database', status: 'connected', host: 'pg-prod.internal:5432', entities: 24, lastActive: 'now' },
  { name: 'analytics-mongo', type: 'MongoDB', typeIcon: 'i-lucide-database', status: 'connected', host: 'mongo-analytics:27017', entities: 12, lastActive: '2min ago' },
  { name: 'legacy-mssql', type: 'SQL Server', typeIcon: 'i-lucide-database', status: 'connected', host: 'sql-legacy.corp.net:1433', entities: 56, lastActive: '5min ago' },
  { name: 'staging-mysql', type: 'MySQL', typeIcon: 'i-lucide-database', status: 'disconnected', host: 'mysql-staging:3306', entities: 18, lastActive: '1h ago' },
  { name: 'user-profiles', type: 'Metal', typeIcon: 'i-lucide-server', status: 'connected', host: 'local', entities: 3, lastActive: 'now' },
  { name: 'in-memory-cache', type: 'Memory', typeIcon: 'i-lucide-cpu', status: 'connected', host: 'local', entities: 1, lastActive: 'now' },
  { name: 'salesforce-api', type: 'Web Service', typeIcon: 'i-lucide-globe', status: 'connected', host: 'api.salesforce.com', entities: 8, lastActive: '30s ago' },
  { name: 'adventure-works', type: 'Cosmos DB', typeIcon: 'i-lucide-database', status: 'disconnected', host: 'cosmos-account.documents.azure.com:443', entities: 0, lastActive: '1d ago' }
])

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'host', header: 'Host' },
  { accessorKey: 'entities', header: 'Entities' },
  { accessorKey: 'lastActive', header: 'Last Active' },
  { accessorKey: 'status', header: 'Status' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-plug ml-0 mr-2" />Sources</h1>
      <p class="text-sm text-muted">Data source connections and their status</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Connected</span>
            <UIcon name="i-lucide-plug" class="size-4 text-success" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ sources.filter(s => s.status === 'connected').length }}</p>
      </UCard>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Disconnected</span>
            <UIcon name="i-lucide-plug-off" class="size-4 text-error" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ sources.filter(s => s.status !== 'connected').length }}</p>
      </UCard>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Total Entities</span>
            <UIcon name="i-lucide-table" class="size-4 text-info" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ sources.reduce((a, s) => a + s.entities, 0) }}</p>
      </UCard>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Source Types</span>
            <UIcon name="i-lucide-layers" class="size-4 text-primary" />
          </div>
        </template>
        <p class="text-2xl font-bold">{{ new Set(sources.map(s => s.type)).size }}</p>
      </UCard>
    </div>

    <UCard>
      <UTable :columns="columns" :rows="sources">
        <template #type-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon :name="row.typeIcon" class="size-4 text-muted" />
            <span>{{ row.type }}</span>
          </div>
        </template>
        <template #status-cell="{ row }">
          <div class="flex items-center gap-2">
            <div
              class="size-2 rounded-full"
              :class="row.status === 'connected' ? 'bg-success' : 'bg-error'"
            />
            <span class="text-sm">{{ row.status }}</span>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
