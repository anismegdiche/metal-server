<script setup lang="ts">
const schemas = ref([
  {
    name: 'public',
    entities: [
      { name: 'users', type: 'table', columns: ['id', 'name', 'email', 'role', 'created_at'], rows: 15420 },
      { name: 'orders', type: 'table', columns: ['id', 'user_id', 'total', 'status', 'created_at'], rows: 89200 },
      { name: 'products', type: 'table', columns: ['id', 'sku', 'name', 'price', 'category', 'stock'], rows: 3450 }
    ]
  },
  {
    name: 'analytics',
    entities: [
      { name: 'page_views', type: 'table', columns: ['id', 'url', 'user_agent', 'ip', 'timestamp'], rows: 2500000 },
      { name: 'events', type: 'table', columns: ['id', 'event_type', 'payload', 'created_at'], rows: 500000 }
    ]
  },
  {
    name: 'logs',
    entities: [
      { name: 'access_log', type: 'table', columns: ['id', 'method', 'path', 'status', 'duration', 'timestamp'], rows: 10000000 },
      { name: 'error_log', type: 'table', columns: ['id', 'message', 'stack', 'level', 'timestamp'], rows: 2500 }
    ]
  }
])

const selectedSchema = ref(schemas.value[0].name)
const selectedEntity = ref(schemas.value[0].entities[0])

const previewRows = ref([
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', created_at: '2024-01-15' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', created_at: '2024-03-22' },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'editor', created_at: '2024-06-10' },
  { id: 4, name: 'Dan Wilson', email: 'dan@example.com', role: 'user', created_at: '2024-09-05' },
  { id: 5, name: 'Eve Martin', email: 'eve@example.com', role: 'admin', created_at: '2025-01-30' }
])

const currentSchema = computed(() => schemas.value.find(s => s.name === selectedSchema.value))
const currentEntity = computed(() => {
  const entity = currentSchema.value?.entities.find(e => e.name === selectedEntity.value?.name)
  if (entity && entity !== selectedEntity.value) {
    selectedEntity.value = entity
  }
  return entity
})

watch(selectedSchema, (schemaName) => {
  const schema = schemas.value.find(s => s.name === schemaName)
  if (schema?.entities.length) {
    selectedEntity.value = schema.entities[0]
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-database ml-0 mr-2" />Data Browser</h1>
      <p class="text-sm text-muted">Browse and preview data across schemas and entities</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <UCard class="lg:col-span-1">
        <template #header>
          <h2 class="font-semibold">Schemas</h2>
        </template>
        <UNavigationMenu
          :items="schemas.map(s => ({
            label: s.name,
            icon: 'i-lucide-folder',
            children: s.entities.map(e => ({
              label: e.name,
              icon: 'i-lucide-table',
              onSelect() {
                selectedSchema.value = s.name
                selectedEntity.value = e
              }
            }))
          }))"
          orientation="vertical"
        />
      </UCard>

      <UCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <div v-if="currentEntity">
              <h2 class="font-semibold">{{ currentSchema?.name }}.{{ currentEntity.name }}</h2>
              <p class="text-xs text-muted">{{ currentEntity.rows.toLocaleString() }} rows • {{ currentEntity.columns.length }} columns</p>
            </div>
            <div v-else>
              <h2 class="font-semibold">Select an entity</h2>
            </div>
          </div>
        </template>

        <div v-if="currentEntity" class="flex flex-col gap-4">
          <div class="flex gap-2 flex-wrap">
            <UBadge
              v-for="col in currentEntity.columns"
              :key="col"
              variant="subtle"
              color="neutral"
              size="sm"
            >
              {{ col }}
            </UBadge>
          </div>

          <UTable
            :columns="currentEntity.columns.map(c => ({ accessorKey: c, header: c }))"
            :rows="previewRows"
            class="max-h-96"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
