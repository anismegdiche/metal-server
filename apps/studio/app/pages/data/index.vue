<script setup lang="ts">
import { getProviderIcon } from '~/utils/constants'

interface SourceConfig {
  provider: string
  database?: string
  host?: string
  port?: number
  user?: string
  password?: string
  options?: Record<string, any>
}

interface SchemaConfig {
  source?: string
  entities?: Record<string, { source: string; entity: string }>
}

const sources = ref<Record<string, SourceConfig>>({})
const schemas = ref<Record<string, SchemaConfig>>({})
const sourcesLoading = ref(true)
const schemasLoading = ref(true)

const sourceModalRef = ref<InstanceType<any>>(null)
const schemaModalRef = ref<InstanceType<any>>(null)

const sourceTableData = computed(() =>
  Object.entries(sources.value).map(([name, config]) => ({
    name,
    provider: config.provider,
    host: config.host ?? '-',
    port: config.port ?? '',
    database: config.database ?? '-',
  }))
)

const schemaTableData = computed(() =>
  Object.entries(schemas.value).map(([name, config]) => ({
    name,
    source: config.source ?? '-',
    entityCount: config.entities ? Object.keys(config.entities).length : 0,
  }))
)

const sourceColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'host', header: 'Host' },
  { accessorKey: 'database', header: 'Database' },
  { accessorKey: 'actions', header: '' },
]

const schemaColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'entityCount', header: 'Entities' },
  { accessorKey: 'actions', header: '' },
]

const sourceOptions = computed(() =>
  Object.keys(sources.value).map((name) => ({ label: name, value: name }))
)

async function loadSources() {
  sourcesLoading.value = true
  try {
    sources.value = await $fetch('/server-api/api/config/sources')
  } catch {
    sources.value = {}
  } finally {
    sourcesLoading.value = false
  }
}

async function loadSchemas() {
  schemasLoading.value = true
  try {
    schemas.value = await $fetch('/server-api/api/config/schemas')
  } catch {
    schemas.value = {}
  } finally {
    schemasLoading.value = false
  }
}

async function loadData() {
  await Promise.all([loadSources(), loadSchemas()])
}

function openAddSource() {
  sourceModalRef.value?.openAdd()
}

function openEditSource(name: string) {
  sourceModalRef.value?.openEdit(name)
}

async function deleteSource(name: string) {
  try {
    await $fetch(`/server-api/api/config/sources/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await loadSources()
  } catch (e) {
    console.error('Failed to delete source', e)
  }
}

function openAddSchema() {
  schemaModalRef.value?.openAdd()
}

function openEditSchema(name: string) {
  schemaModalRef.value?.openEdit(name)
}

async function deleteSchema(name: string) {
  try {
    await $fetch(`/server-api/api/config/schemas/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await loadSchemas()
  } catch (e) {
    console.error('Failed to delete schema', e)
  }
}

onMounted(loadData)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-database" title="Data" description="Manage sources, schemas, and browse data" />
      <UButton icon="i-lucide-refresh-cw" label="Refresh" size="sm" variant="outline" @click="loadData" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-plug" class="size-4 text-primary" />
              <h2 class="font-semibold text-sm">Sources</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Source" size="xs" variant="outline" @click="openAddSource" />
          </div>
        </template>
        <UTable :columns="sourceColumns" :data="sourceTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #provider-cell="{ row }">
            <div class="flex items-center gap-2">
              <UIcon :name="getProviderIcon(row.original.provider)" class="size-4 text-muted" />
              <span>{{ row.original.provider }}</span>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditSource(row.original.name)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="deleteSource(row.original.name)" />
            </div>
          </template>
        </UTable>
        <div v-if="sourcesLoading" class="text-center text-sm text-muted py-4">Loading sources...</div>
        <div v-else-if="sourceTableData.length === 0" class="text-center text-sm text-muted py-4">No sources configured</div>
      </UCard>

      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-book-open" class="size-4 text-warning" />
              <h2 class="font-semibold text-sm">Schemas</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Schema" size="xs" variant="outline" @click="openAddSchema" />
          </div>
        </template>
        <UTable :columns="schemaColumns" :data="schemaTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #entityCount-cell="{ row }">
            <UBadge variant="subtle" color="neutral" size="sm">{{ row.original.entityCount }}</UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditSchema(row.original.name)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="deleteSchema(row.original.name)" />
            </div>
          </template>
        </UTable>
        <div v-if="schemasLoading" class="text-center text-sm text-muted py-4">Loading schemas...</div>
        <div v-else-if="schemaTableData.length === 0" class="text-center text-sm text-muted py-4">No schemas configured</div>
      </UCard>
    </div>

    <DataBrowser :sources="sources" :schemas="schemas" />

    <SourceModal ref="sourceModalRef" :sources="sources" @saved="loadSources" />

    <SchemaModal ref="schemaModalRef" :schemas="schemas" :source-options="sourceOptions" @saved="loadSchemas" />
  </div>
</template>
