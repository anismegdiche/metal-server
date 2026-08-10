<script setup lang="ts">
interface SourceConfig {
  provider: string
}

interface SchemaConfig {
  source?: string
}

type McpToolParam = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'json' | 'structure'
  required: boolean
  description: string
  mapTo: string
  enumValues?: string
  children?: McpToolParam[]
  itemsType?: 'string' | 'number' | 'boolean' | 'json' | 'structure'
}

type McpTool = {
  name: string
  description: string
  schema: string
  entity: string
  action: 'read' | 'create' | 'update' | 'delete' | 'list'
  fields: string[]
  limit: number
  arguments: McpToolParam[]
}

type McpToolForm = Omit<McpTool, 'fields'> & { fieldsInput: string }

const sources = ref<Record<string, SourceConfig>>({})
const schemas = ref<Record<string, SchemaConfig>>({})
const tools = ref<McpTool[]>([])
const isLoading = ref(true)
const selectedTool = ref<McpTool | null>(null)
const isEditorOpen = ref(false)

const schemaOptions = computed(() => Object.keys(schemas.value).map(name => ({ label: name, value: name })))
const actionOptions = [
  { label: 'Read', value: 'read' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'List', value: 'list' }
]

const toolForm = ref<McpToolForm>({
  name: '',
  description: '',
  schema: '',
  entity: '',
  action: 'read',
  fieldsInput: '',
  limit: 10,
  arguments: []
})

watch(() => toolForm.value.action, (action) => {
  if (action === 'list') {
    toolForm.value.entity = ''
  }
})

const entityOptions = ref<{ label: string, value: string }[]>([])
const entityLoading = ref(false)

async function loadSchemaEntities(schema: string) {
  if (!schema) {
    entityOptions.value = []
    return
  }
  entityLoading.value = true
  try {
    const res = await $fetch<{ rows?: { name?: unknown }[] }>(`/server-api/schema/${encodeURIComponent(schema)}`)
    const names = (res.rows ?? []).map(r => String(r.name ?? '')).filter(Boolean)
    if (toolForm.value.entity && !names.includes(toolForm.value.entity)) {
      names.unshift(toolForm.value.entity)
    }
    entityOptions.value = names.map(name => ({ label: name, value: name }))
  } catch {
    entityOptions.value = []
  } finally {
    entityLoading.value = false
  }
}

watch(() => toolForm.value.schema, (schema) => {
  loadSchemaEntities(schema ?? '')
})

function onSchemaChange(schema: string) {
  toolForm.value.entity = ''
  loadSchemaEntities(schema)
}

const toolTableData = computed(() => tools.value.map(tool => ({
  name: tool.name,
  description: tool.description,
  schema: tool.schema,
  action: tool.action,
  entity: tool.action === 'list' ? '—' : tool.entity ?? '',
  limit: tool.action === 'list' || tool.action === 'read' ? tool.limit : '—',
  tool
})))

const toolColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'schema', header: 'Schema' },
  { accessorKey: 'entity', header: 'Entity' },
  { accessorKey: 'limit', header: 'Limit' },
  { accessorKey: 'actions', header: '' }
]

async function loadData() {
  isLoading.value = true
  try {
    sources.value = await $fetch('/server-api/api/config/sources')
    schemas.value = await $fetch('/server-api/api/config/schemas')
    const mcpConfig = await $fetch('/server-api/api/config/mcp')
    tools.value = Object.entries(mcpConfig?.tools ?? {}).map(([name, config]) => {
      const typedConfig = config as Record<string, unknown>
      return {
        name,
        description: String(typedConfig.description ?? ''),
        schema: String(typedConfig.schema ?? ''),
        entity: String(typedConfig.entity ?? ''),
        action: String(typedConfig.action ?? 'read') as McpTool['action'],
        fields: Array.isArray(typedConfig.fields) ? typedConfig.fields.map(field => String(field)) : [],
        limit: typeof typedConfig.limit === 'number' ? typedConfig.limit : 10,
        arguments: Object.entries(typedConfig.arguments ?? {}).map(([argName, argConfig]) => {
          const typedArg = argConfig as Record<string, unknown>
          const argType = String(typedArg.type ?? 'string') as McpToolParam['type']
          const param: McpToolParam = {
            name: argName,
            type: argType,
            required: Boolean(typedArg.required),
            description: String(typedArg.description ?? ''),
            mapTo: String(typedArg['map-to'] ?? ''),
            enumValues: Array.isArray(typedArg.enum)
              ? typedArg.enum
                .map(value => String(value).trim())
                .filter(Boolean)
                .join(',')
              : ''
          }
          if (argType === 'structure' && typedArg.properties && typeof typedArg.properties === 'object') {
            param.children = Object.entries(typedArg.properties as Record<string, unknown>).map(([childName, childConfig]) => {
              const child = childConfig as Record<string, unknown>
              return {
                name: childName,
                type: String(child.type ?? 'string') as McpToolParam['type'],
                required: Boolean(child.required),
                description: String(child.description ?? ''),
                mapTo: String(child['map-to'] ?? ''),
                enumValues: Array.isArray(child.enum)
                  ? child.enum.map(v => String(v).trim()).filter(Boolean).join(',')
                  : ''
              }
            })
          }
          if (argType === 'array' && typedArg.items && typeof typedArg.items === 'object') {
            const items = typedArg.items as Record<string, unknown>
            param.itemsType = String(items.type ?? 'string') as McpToolParam['itemsType']
          }
          return param
        })
      }
    })
  } catch (e) {
    console.error('Failed to load MCP tools', e)
    tools.value = []
  } finally {
    isLoading.value = false
  }
}

function createToolForm(tool?: McpTool): McpToolForm {
  if (!tool) {
    return {
      name: '',
      description: '',
      schema: '',
      entity: '',
      action: 'read',
      fieldsInput: '',
      limit: 10,
      arguments: []
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    entity: tool.entity ?? '',
    action: tool.action,
    fieldsInput: tool.fields.join(','),
    limit: tool.limit,
    arguments: tool.arguments.map(arg => ({
      ...arg,
      enumValues: arg.enumValues ?? '',
      children: arg.children ? arg.children.map(c => ({ ...c, enumValues: c.enumValues ?? '' })) : undefined
    }))
  }
}

function openNewTool() {
  toolForm.value = createToolForm()
  selectedTool.value = null
  isEditorOpen.value = true
}

function openEditTool(tool: McpTool) {
  toolForm.value = createToolForm(tool)
  selectedTool.value = tool
  isEditorOpen.value = true
}

function addArgument() {
  toolForm.value.arguments.push({ name: '', type: 'string', required: false, description: '', mapTo: '', enumValues: '' })
}

function addChildArgument(parent: McpToolParam) {
  if (!parent.children) parent.children = []
  parent.children.push({ name: '', type: 'string', required: false, description: '', mapTo: '', enumValues: '' })
}

function removeChildArgument(parent: McpToolParam, index: number) {
  parent.children?.splice(index, 1)
}

function removeArgument(index: number) {
  toolForm.value.arguments.splice(index, 1)
}

async function saveTool() {
  if (!toolForm.value.name || !toolForm.value.description || !toolForm.value.schema) return

  const payload = {
    description: toolForm.value.description,
    schema: toolForm.value.schema,
    ...(toolForm.value.action !== 'list' && toolForm.value.entity ? { entity: toolForm.value.entity } : {}),
    action: toolForm.value.action,
    fields: toolForm.value.fieldsInput.split(',').map(field => field.trim()).filter(Boolean),
    ...(toolForm.value.action === 'read' || toolForm.value.action === 'list' ? { limit: toolForm.value.limit } : {}),
    arguments: Object.fromEntries(toolForm.value.arguments.map(arg => {
      const argPayload: Record<string, unknown> = {
        type: arg.type,
        required: arg.required,
        description: arg.description
      }
      // map-to for all types except structure (structure uses properties instead)
      if (arg.type !== 'structure' && arg.mapTo) {
        argPayload['map-to'] = arg.mapTo
      }
      // enum for scalar types
      if ((arg.type === 'string' || arg.type === 'number' || arg.type === 'boolean') && arg.enumValues) {
        argPayload.enum = arg.enumValues.split(',').map(v => v.trim()).filter(Boolean)
      }
      // properties for structure
      if (arg.type === 'structure' && arg.children && arg.children.length > 0) {
        argPayload.properties = Object.fromEntries(arg.children.map(child => {
          const childPayload: Record<string, unknown> = {
            type: child.type,
            required: child.required,
            description: child.description
          }
          if (child.type !== 'structure' && child.mapTo) {
            childPayload['map-to'] = child.mapTo
          }
          if ((child.type === 'string' || child.type === 'number' || child.type === 'boolean') && child.enumValues) {
            childPayload.enum = child.enumValues.split(',').map(v => v.trim()).filter(Boolean)
          }
          return [child.name, childPayload]
        }))
      }
      // items for array
      if (arg.type === 'array' && arg.itemsType) {
        const itemsPayload: Record<string, unknown> = { type: arg.itemsType }
        if (arg.itemsType !== 'structure' && arg.mapTo) {
          itemsPayload['map-to'] = arg.mapTo
        }
        if (arg.itemsType === 'structure' && arg.children && arg.children.length > 0) {
          itemsPayload.properties = Object.fromEntries(arg.children.map(child => {
            const childPayload: Record<string, unknown> = { type: child.type, required: child.required, description: child.description }
            if (child.mapTo) childPayload['map-to'] = child.mapTo
            return [child.name, childPayload]
          }))
        }
        if ((arg.itemsType === 'string' || arg.itemsType === 'number' || arg.itemsType === 'boolean') && arg.enumValues) {
          itemsPayload.enum = arg.enumValues.split(',').map(v => v.trim()).filter(Boolean)
        }
        argPayload.items = itemsPayload
      }
      return [arg.name, argPayload]
    }))
  }

  const currentConfig = await $fetch('/server-api/api/config/mcp')
  const merged = {
    ...currentConfig,
    tools: {
      ...(currentConfig?.tools ?? {}),
      [toolForm.value.name]: payload
    }
  }

  await $fetch('/server-api/api/config', { method: 'PUT', body: merged })
  isEditorOpen.value = false
  await loadData()
}

async function deleteTool(name: string) {
  const currentConfig = await $fetch('/server-api/api/config/mcp')
  const toolsConfig = { ...(currentConfig?.tools ?? {}) }
  const { [name]: _removed, ...remainingTools } = toolsConfig
  const merged = { ...currentConfig, tools: remainingTools }
  await $fetch('/server-api/api/config', { method: 'PUT', body: merged })
  await loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-atom" title="MCP Tools"
        description="Configure MCP tools based on schemas and sources." />
      <UButton icon="i-lucide-plus" label="New Tool" size="sm" variant="outline" @click="openNewTool" />
    </div>

    <UCard class="bg-metal-gradient">

      <div class="p-4">
        <div v-if="isLoading" class="text-sm text-muted">
          Loading MCP tools...
        </div>
        <div v-else-if="tools.length === 0" class="text-sm text-muted">
          No MCP tools configured yet.
        </div>
        <UTable v-else :columns="toolColumns" :data="toolTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditTool(row.original.tool)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error"
                @click="deleteTool(row.original.name)" />
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <UModal v-model:open="isEditorOpen" title="MCP Tool Editor" :ui="{ content: 'max-w-2xl w-full' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" orientation="horizontal" description="Name of the tool as displayed in MCP server"
            :ui="{
              description: 'text-xs'
            }">
            <UInput v-model="toolForm.name" placeholder="tool-name" :disabled="!!selectedTool" />
          </UFormField>
          <UFormField label="Description" orientation="horizontal"
            description="Human-readable description of what this tool does" :ui="{
              description: 'text-xs'
            }">
            <UInput class="w-sm" v-model="toolForm.description" placeholder="Describe the tool" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Schema" orientation="horizontal" description="Schema this tool operates on" :ui="{
              description: 'text-xs'
            }">
              <USelect v-model="toolForm.schema" :items="schemaOptions" placeholder="Select schema" @update:model-value="onSchemaChange" />
            </UFormField>
            <UFormField label="Action" orientation="horizontal" description="Schema operation type" :ui="{
              description: 'text-xs'
            }">
              <USelect v-model="toolForm.action" :items="actionOptions" />
            </UFormField>
            <UFormField v-if="toolForm.action !== 'list'" label="Entity" orientation="horizontal"
              description="Target schema's entity" :ui="{
                description: 'text-xs'
              }">
              <USelect v-model="toolForm.entity" :items="entityOptions" placeholder="Select entity" :loading="entityLoading" :disabled="!toolForm.schema" />
            </UFormField>
            <UFormField v-if="toolForm.action === 'read' || toolForm.action === 'list'" label="Limit"
              orientation="horizontal" description="Maximum number of rows to return" :ui="{
                description: 'text-xs'
              }">
              <UInput v-model="toolForm.limit" type="number" min="1" />
            </UFormField>
          </div>
          <div v-if="toolForm.action === 'read'" class="grid grid-cols-1 gap-4">
            <UFormField label="Fields" orientation="horizontal"
              description="Fields to return in the result, comma-separated" :ui="{
                description: 'text-xs'
              }">
              <UInput class="w-sm" v-model="toolForm.fieldsInput" placeholder="id,name,status" />
            </UFormField>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Arguments</span>
              <UButton icon="i-lucide-plus" size="xs" variant="outline" @click="addArgument" />
            </div>
            <div v-if="toolForm.arguments.length === 0" class="text-xs text-muted">
              No arguments defined.
            </div>
            <div v-for="(arg, index) in toolForm.arguments" :key="index"
              class="border border-metal-200 dark:border-metal-700 rounded-lg p-3 space-y-3">
              <div class="grid grid-cols-5 md:grid-cols-[1fr_140px_160px_auto_auto] gap-2 items-end">
                <UInput v-model="arg.name" placeholder="name" />
                <USelect v-model="arg.type" :items="[
                  { label: 'String', value: 'string' },
                  { label: 'Number', value: 'number' },
                  { label: 'Boolean', value: 'boolean' },
                  { label: 'Array', value: 'array' },
                  { label: 'JSON', value: 'json' },
                  { label: 'Structure', value: 'structure' }
                ]" />
                <UInput v-if="arg.type !== 'structure'" v-model="arg.mapTo" placeholder="map-to" />
                <div class="flex items-center">
                  <UCheckbox v-model="arg.required" description="Required" />
                </div>
                <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeArgument(index)"
                  class="ml-auto  w-1/8" />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <UInput v-model="arg.description" placeholder="Description" />
                <UInput v-if="arg.type === 'string' || arg.type === 'number' || arg.type === 'boolean'"
                  v-model="arg.enumValues" placeholder="Comma-separated enum values" />
                <USelect v-if="arg.type === 'array'" v-model="arg.itemsType" :items="[
                  { label: 'String', value: 'string' },
                  { label: 'Number', value: 'number' },
                  { label: 'Boolean', value: 'boolean' },
                  { label: 'JSON', value: 'json' },
                  { label: 'Structure', value: 'structure' }
                ]" placeholder="Items type" />
              </div>
              <!-- Structure children or array items of type structure -->
              <div v-if="arg.type === 'structure' || (arg.type === 'array' && arg.itemsType === 'structure')"
                class="pl-4 border-l-2 border-metal-300 dark:border-metal-600 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted">Properties</span>
                  <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="addChildArgument(arg)" />
                </div>
                <div v-for="(child, ci) in arg.children" :key="ci"
                  class="grid grid-cols-4 md:grid-cols-[1fr_120px_120px_auto] gap-2 items-end">
                  <UInput v-model="child.name" placeholder="name" />
                  <USelect v-model="child.type" :items="[
                    { label: 'String', value: 'string' },
                    { label: 'Number', value: 'number' },
                    { label: 'Boolean', value: 'boolean' },
                    { label: 'JSON', value: 'json' },
                    { label: 'Array', value: 'array' }
                  ]" />
                  <UInput v-model="child.mapTo" placeholder="map-to" />
                  <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error"
                    @click="removeChildArgument(arg, ci)" class="ml-auto  w-1/8" />
                </div>
                <div v-if="!arg.children || arg.children.length === 0" class="text-xs text-muted">
                  No properties defined. Add a property to map fields.
                </div>
              </div>
            </div>
            <div class="text-xs text-muted">
              The checkbox marks the argument as required. Use <strong>map-to</strong> to map the argument to a schema
              field. For <strong>structure</strong> types, define child properties instead. For scalar types, you can
              restrict values with comma-separated <strong>enum</strong> values.
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" @click="isEditorOpen = false" />
          <UButton label="Save" @click="saveTool" />
        </div>
      </template>
    </UModal>
  </div>
</template>
