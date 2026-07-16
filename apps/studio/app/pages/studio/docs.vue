<script setup lang="ts">

const routes = [
  { method: 'GET', path: '/schema/:schema', description: 'List entities in a schema', auth: true },
  { method: 'GET', path: '/schema/:schema/:entity', description: 'Query entity data', auth: true },
  { method: 'POST', path: '/schema/:schema/:entity', description: 'Insert rows', auth: true },
  { method: 'PATCH', path: '/schema/:schema/:entity', description: 'Update rows', auth: true },
  { method: 'DELETE', path: '/schema/:schema/:entity', description: 'Delete rows', auth: true },
  { method: 'GET', path: '/server/info', description: 'Server metadata', auth: false },
  { method: 'POST', path: '/server/reload', description: 'Full server reload', auth: true },
  { method: 'POST', path: '/server/reload-plans', description: 'Reload plans only', auth: true },
  { method: 'GET', path: '/metrics/', description: 'All metrics', auth: false },
  { method: 'GET', path: '/metrics/:name', description: 'Specific metric', auth: false },
  { method: 'GET', path: '/metrics/:from/:to', description: 'Metric range', auth: false },
  { method: 'POST', path: '/plan/:plan/reload', description: 'Reload a plan', auth: true },
  { method: 'GET', path: '/plan/:plan/metrics', description: 'Plan execution metrics', auth: false },
  { method: 'GET', path: '/cache/view', description: 'View cache contents', auth: true },
  { method: 'POST', path: '/cache/clean', description: 'Clean expired entries', auth: true },
  { method: 'POST', path: '/cache/purge', description: 'Purge entire cache', auth: true },
  { method: 'POST', path: '/schedule/:job/start', description: 'Start a schedule', auth: true },
  { method: 'POST', path: '/schedule/:job/stop', description: 'Stop a schedule', auth: true },
]

const methodColor: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-info',
  PATCH: 'text-warning',
  DELETE: 'text-error',
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-book-open" class="ml-0 mr-2" />API Reference</h1>
      <p class="text-sm text-muted">Available REST API endpoints</p>
    </div>

    <UCard>
      <UTable
        :columns="[
          { accessorKey: 'method', header: 'Method' },
          { accessorKey: 'path', header: 'Path' },
          { accessorKey: 'description', header: 'Description' },
          { accessorKey: 'auth', header: 'Auth' }
        ]"
        :data="routes"
      >
        <template #method-cell="{ row }">
          <span class="text-xs font-mono font-bold" :class="methodColor[row.original.method]">
            {{ row.original.method }}
          </span>
        </template>
        <template #path-cell="{ row }">
          <code class="text-xs font-mono bg-muted/30 px-1.5 py-0.5 rounded">{{ row.original.path }}</code>
        </template>
        <template #auth-cell="{ row }">
          <UBadge v-if="row.original.auth" color="warning" variant="subtle" size="xs">Required</UBadge>
          <UBadge v-else color="neutral" variant="subtle" size="xs">Public</UBadge>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
