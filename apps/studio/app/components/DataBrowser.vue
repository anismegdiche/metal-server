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

const props = defineProps<{
  sources: Record<string, SourceConfig>
  schemas: Record<string, SchemaConfig>
}>()

const treeData = computed(() =>
  Object.entries(props.sources).map(([name, config]) => ({
    name,
    provider: config.provider,
    schemas: Object.entries(props.schemas)
      .filter(([, s]) => s.source === name)
      .map(([schemaName, schemaConfig]) => ({
        name: schemaName,
        entities: schemaConfig.entities
          ? Object.entries(schemaConfig.entities).map(([key, val]) => ({ name: key, source: val.source, entity: val.entity }))
          : [],
      })),
  }))
)

const expandedSources = ref<Record<string, boolean>>({})

function isSourceExpanded(name: string): boolean {
  return expandedSources.value[name] ?? false
}

function toggleSource(name: string) {
  expandedSources.value[name] = !isSourceExpanded(name)
  if (isSourceExpanded(name) && !sourceEntities.value[name]) fetchSourceEntities(name)
}

const selectedEntity = ref<{ source: string; schema: string; entity: { name: string; source: string; entity: string } } | null>(null)
const previewRows = ref<Record<string, unknown>[]>([])
const previewFields = ref<string[]>([])
const previewTotal = ref<number | null>(null)
const previewLoading = ref(false)

const PREVIEW_LIMIT = 50

const sourceEntities = ref<Record<string, { name: string; type?: string; size?: number }[]>>({})
const sourceEntitiesLoading = ref<Record<string, boolean>>({})

async function fetchSourceEntities(sourceName: string) {
  if (sourceEntitiesLoading.value[sourceName]) return
  sourceEntitiesLoading.value[sourceName] = true
  try {
    const res = await $fetch<Record<string, unknown>>(`/server-api/api/source/${encodeURIComponent(sourceName)}`)
    const rows = (res.rows ?? []) as Record<string, unknown>[]
    sourceEntities.value[sourceName] = rows.map((r: Record<string, unknown>) => ({
      name: String(r.name ?? ''),
      type: r.type ? String(r.type) : undefined,
      size: r.size ? Number(r.size) : undefined,
    }))
  } catch {
    sourceEntities.value[sourceName] = []
  } finally {
    sourceEntitiesLoading.value[sourceName] = false
  }
}

async function fetchEntityRows(sourceName: string, entityName: string) {
  previewLoading.value = true
  previewRows.value = []
  previewFields.value = []
  previewTotal.value = null
  try {
    const res = await $fetch<Record<string, unknown>>(
      `/server-api/api/source/${encodeURIComponent(sourceName)}/${encodeURIComponent(entityName)}?limit=${PREVIEW_LIMIT}`,
    )
    const rows = (res.rows ?? []) as Record<string, unknown>[]
    let fieldNames: string[] = []
    const fieldsObj = res.fields
    if (fieldsObj && typeof fieldsObj === 'object' && !Array.isArray(fieldsObj)) {
      fieldNames = Object.keys(fieldsObj)
    }
    if (fieldNames.length === 0 && rows.length > 0) {
      fieldNames = Object.keys(rows[0]!)
    }
    const metadata = res.metadata as { __pagination__?: { total?: number } } | undefined
    previewTotal.value = metadata?.__pagination__?.total ?? null
    previewFields.value = fieldNames
    previewRows.value = rows
  } catch {
    previewFields.value = []
    previewRows.value = []
    previewTotal.value = null
  } finally {
    previewLoading.value = false
  }
}

function selectEntity(sourceName: string, schemaName: string, entity: { name: string; source: string; entity: string }) {
  selectedEntity.value = { source: sourceName, schema: schemaName, entity }
  fetchEntityRows(sourceName, entity.entity)
}
</script>

<template>
  <UCard class="bg-metal-gradient">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-table" class="size-5 text-info" />
        <h2 class="font-semibold text-sm">Data Browser</h2>
      </div>
    </template>

    <div class="flex h-96">
      <div class="w-56 border-r border-default flex flex-col shrink-0">
        <div class="flex-1 overflow-auto p-2">
          <div v-for="node in treeData" :key="node.name" class="mb-1">
            <div
              class="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-elevated/50 rounded text-sm font-medium"
              @click="toggleSource(node.name)"
            >
              <UIcon :name="isSourceExpanded(node.name) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-muted" />
              <UIcon :name="getProviderIcon(node.provider)" class="size-3.5 text-primary" />
              <span>{{ node.name }}</span>
              <span v-if="sourceEntitiesLoading[node.name]" class="ml-auto text-[10px] text-muted">loading...</span>
            </div>
            <div v-if="isSourceExpanded(node.name)" class="ml-5 border-l border-default pl-2">
              <div v-if="sourceEntitiesLoading[node.name]" class="px-2 py-1 text-xs text-muted italic">Loading entities...</div>
              <div v-else-if="(sourceEntities[node.name] ?? []).length === 0" class="px-2 py-1 text-xs text-muted italic">No entities found</div>
              <div
                v-for="ent in sourceEntities[node.name] ?? []"
                :key="ent.name"
                class="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-elevated/50 rounded text-sm"
                :class="{ 'bg-elevated/50': selectedEntity?.entity.entity === ent.name && selectedEntity?.source === node.name }"
                @click="selectEntity(node.name, node.name, { name: ent.name, source: node.name, entity: ent.name })"
              >
                <UIcon name="i-lucide-table" class="size-3.5 text-info" />
                <span>{{ ent.name }}</span>
                <span v-if="ent.size" class="ml-auto text-[10px] text-muted">{{ ent.size.toLocaleString() }}</span>
              </div>
            </div>
          </div>
          <div v-if="treeData.length === 0" class="px-2 py-1 text-xs text-muted italic">No sources</div>
        </div>
      </div>

      <div class="flex-1 flex flex-col min-w-0">
        <div v-if="selectedEntity" class="flex flex-col h-full">
          <div class="px-3 py-2 border-b border-default flex items-center justify-between">
            <div>
              <h3 class="text-sm font-medium">{{ selectedEntity.source }}.{{ selectedEntity.entity.name }}</h3>
              <p class="text-[10px] text-muted">
                <template v-if="previewTotal != null && previewRows.length < previewTotal">Showing first {{ previewRows.length }} of {{ previewTotal.toLocaleString() }} rows</template>
                <template v-else>{{ previewRows.length }} rows</template>
                &middot; {{ previewFields.length }} columns
              </p>
            </div>
            <div class="flex gap-1 flex-wrap">
              <UBadge v-for="col in previewFields" :key="col" variant="subtle" color="neutral" size="sm">
                {{ col }}
              </UBadge>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-3">
            <div v-if="previewLoading" class="flex items-center justify-center text-muted text-sm py-8">Loading rows...</div>
            <UTable v-else-if="previewRows.length > 0"
              :columns="previewFields.map(c => ({ accessorKey: c, header: c }))"
              :data="previewRows"
              :ui="{ th: 'px-2', td: 'px-2 py-1 text-xs' }"
            />
            <div v-else class="flex items-center justify-center text-muted text-sm py-8">No rows returned</div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-muted text-sm">
          Select an entity from the explorer
        </div>
      </div>
    </div>
  </UCard>
</template>
