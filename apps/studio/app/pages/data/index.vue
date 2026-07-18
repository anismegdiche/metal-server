<script setup lang="ts">
import { getProviderIcon } from '~/utils/constants'

const sources = ref([
  { name: 'mydisk', type: 'storage', host: 'localhost:5432', database: 'main', status: 'connected', entities: 12 },
  { name: 'db-mysql', type: 'mysql', host: 'localhost:3306', database: 'app', status: 'connected', entities: 8 },
  { name: 'my-webservice', type: 'webservice', host: '/data/app.db', database: 'app', status: 'disconnected', entities: 5 },
])

const schemas = ref([
  { name: 'public', source: 'mydisk' },
  { name: 'analytics', source: 'db-mysql', count: 2 },
  { name: 'app', source: 'mydisk', count: 2 },
])

const tree = ref([
  {
    name: 'PostgreSQL',
    expanded: true,
    schemas: [
      {
        name: 'public',
        expanded: true,
        entities: [
          { name: 'users', columns: ['id', 'name', 'email', 'role', 'created_at'], rows: 15420 },
          { name: 'orders', columns: ['id', 'user_id', 'total', 'status', 'created_at'], rows: 89200 },
          { name: 'products', columns: ['id', 'sku', 'name', 'price', 'category', 'stock'], rows: 3450 },
        ]
      },
      {
        name: 'analytics',
        expanded: false,
        entities: [
          { name: 'page_views', columns: ['id', 'url', 'user_agent', 'ip', 'timestamp'], rows: 2500000 },
          { name: 'events', columns: ['id', 'event_type', 'payload', 'created_at'], rows: 500000 },
        ]
      }
    ]
  },
  {
    name: 'MySQL',
    expanded: false,
    schemas: [
      {
        name: 'app',
        expanded: false,
        entities: [
          { name: 'sessions', columns: ['id', 'user_id', 'token', 'expires_at'], rows: 320000 },
          { name: 'settings', columns: ['key', 'value', 'updated_at'], rows: 120 },
        ]
      }
    ]
  }
])

const selectedEntity = ref<{ source: string; schema: string; entity: typeof tree.value[0]['schemas'][0]['entities'][0] } | null>(null)

const previewRows = ref([
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', created_at: '2024-01-15' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', created_at: '2024-03-22' },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'editor', created_at: '2024-06-10' },
  { id: 4, name: 'Dan Wilson', email: 'dan@example.com', role: 'user', created_at: '2024-09-05' },
  { id: 5, name: 'Eve Martin', email: 'eve@example.com', role: 'admin', created_at: '2025-01-30' },
])

function selectEntity(source: string, schema: string, entity: typeof tree.value[0]['schemas'][0]['entities'][0]) {
  selectedEntity.value = { source, schema, entity }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-database" title="Data" description="Manage sources, schemas, and browse data" />
      <UButton icon="i-lucide-refresh-cw" label="Refresh" size="sm" variant="outline" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-plug" class="size-4 text-primary" />
              <h2 class="font-semibold text-sm">Sources</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Source" size="xs" variant="outline" />
          </div>
        </template>
        <UTable :columns="[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'type', header: 'Type' },
          { accessorKey: 'host', header: 'Host' },
          { accessorKey: 'status', header: 'Status' },
          { accessorKey: 'actions', header: '' },
        ]" :data="sources" :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }">
          <template #type-cell="{ row }">
            <div class="flex items-center gap-2">
              <UIcon :name="getProviderIcon(row.original.type)" class="size-4 text-muted" />
              <span>{{ row.original.type }}</span>
            </div>
          </template>
          <template #status-cell="{ row }">
            <StatusBadge :status="row.original.status === 'connected' ? 'connected' : 'error'" />
          </template>
          <template #actions-cell>
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" />
            </div>
          </template>
        </UTable>
      </UCard>

      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-book-open" class="size-4 text-warning" />
              <h2 class="font-semibold text-sm">Schemas</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Schema" size="xs" variant="outline" />
          </div>
        </template>
        <UTable :columns="[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'source', header: 'Source' },
          { accessorKey: 'count', header: 'Entities' },
          { accessorKey: 'actions', header: '' },
        ]" :data="schemas" :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }">
          <template #actions-cell>
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" />
            </div>
          </template>
        </UTable>
      </UCard>
    </div>

    <UCard class="bg-metal-gradient">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-table" class="size-4 text-info" />
          <h2 class="font-semibold text-sm">Data Browser</h2>
        </div>
      </template>

      <div class="flex h-96">
        <div class="w-56 border-r border-default flex flex-col shrink-0">
          <div class="flex-1 overflow-auto p-2">
            <div v-for="source in tree" :key="source.name" class="mb-1">
              <div
                class="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-elevated/50 rounded text-sm font-medium"
                @click="source.expanded = !source.expanded">
                <UIcon :name="source.expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  class="size-3 text-muted" />
                <UIcon name="i-lucide-database" class="size-3.5 text-primary" />
                <span>{{ source.name }}</span>
              </div>
              <div v-if="source.expanded" class="ml-4">
                <div v-for="schema in source.schemas" :key="schema.name" class="mb-1">
                  <div class="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-elevated/50 rounded text-sm"
                    @click="schema.expanded = !schema.expanded">
                    <UIcon :name="schema.expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="size-3 text-muted" />
                    <UIcon name="i-lucide-folder" class="size-3.5 text-warning" />
                    <span>{{ schema.name }}</span>
                  </div>
                  <div v-if="schema.expanded" class="ml-4">
                    <div v-for="entity in schema.entities" :key="entity.name"
                      class="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-elevated/50 rounded text-sm"
                      :class="{ 'bg-elevated/50': selectedEntity?.entity.name === entity.name && selectedEntity?.source === source.name && selectedEntity?.schema === schema.name }"
                      @click="selectEntity(source.name, schema.name, entity)">
                      <UIcon name="i-lucide-table" class="size-3.5 text-info" />
                      <span>{{ entity.name }}</span>
                      <span class="ml-auto text-[10px] text-muted">{{ entity.rows.toLocaleString() }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 flex flex-col min-w-0">
          <div v-if="selectedEntity" class="flex flex-col h-full">
            <div class="px-3 py-2 border-b border-default flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium">{{ selectedEntity.source }}.{{ selectedEntity.schema }}.{{
                  selectedEntity.entity.name }}</h3>
                <p class="text-[10px] text-muted">{{ selectedEntity.entity.rows.toLocaleString() }} rows &middot; {{
                  selectedEntity.entity.columns.length }} columns</p>
              </div>
              <div class="flex gap-1">
                <UBadge v-for="col in selectedEntity.entity.columns" :key="col" variant="subtle" color="neutral"
                  size="sm">
                  {{ col }}
                </UBadge>
              </div>
            </div>
            <div class="flex-1 overflow-auto p-3">
              <UTable :columns="selectedEntity.entity.columns.map(c => ({ accessorKey: c, header: c }))"
                :data="previewRows"  :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }"/>
            </div>
          </div>
          <div v-else class="flex-1 flex items-center justify-center text-muted text-sm">
            Select an entity from the explorer
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
