<script setup lang="ts">
interface SchemaConfig {
  source?: string
  entities?: Record<string, { source: string; entity: string }>
  anonymize?: string
  roles?: string[]
}

const props = defineProps<{
  schemas: Record<string, SchemaConfig>
  sourceOptions: { label: string; value: string }[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })

const mode = ref<'add' | 'edit'>('add')

const schemaForm = ref({
  name: '',
  source: '',
  entities: [] as { key: string; source: string; entity: string }[],
  anonymize: '',
  roles: [] as string[],
})

const roleInput = ref('')

function addRole() {
  const value = roleInput.value.trim()
  if (value && !schemaForm.value.roles.includes(value)) {
    schemaForm.value.roles.push(value)
  }
  roleInput.value = ''
}

function onRoleBackspace() {
  if (!roleInput.value && schemaForm.value.roles.length > 0) {
    schemaForm.value.roles.pop()
  }
}

function resetForm() {
  schemaForm.value = { name: '', source: '', entities: [], anonymize: '', roles: [] }
  roleInput.value = ''
}

function populateForm(name: string) {
  const config = props.schemas[name]
  if (!config) return
  schemaForm.value = {
    name,
    source: config.source ?? '',
    entities: config.entities
      ? Object.entries(config.entities).map(([key, val]) => ({ key, source: val.source, entity: val.entity }))
      : [],
    anonymize: config.anonymize ?? '',
    roles: config.roles ?? [],
  }
}

function openAdd() {
  mode.value = 'add'
  resetForm()
  open.value = true
}

function openEdit(name: string) {
  mode.value = 'edit'
  populateForm(name)
  open.value = true
}

function addEntity() {
  schemaForm.value.entities.push({ key: '', source: '', entity: '' })
}

function removeEntity(index: number) {
  schemaForm.value.entities.splice(index, 1)
}

async function save() {
  const { name, source, entities, anonymize, roles } = schemaForm.value
  if (!name) return
  const entitiesMap: Record<string, { source: string; entity: string }> = {}
  for (const e of entities) {
    if (e.key) entitiesMap[e.key] = { source: e.source, entity: e.entity }
  }
  const body: SchemaConfig = { source }
  if (Object.keys(entitiesMap).length > 0) body.entities = entitiesMap
  if (anonymize) body.anonymize = anonymize
  if (roles.length > 0) body.roles = roles
  try {
    await $fetch(`/server-api/api/config/schemas/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body,
    })
    open.value = false
    emit('saved')
  } catch (e) {
    console.error('Failed to save schema', e)
  }
}

function removeRole(index: number) {
  schemaForm.value.roles.splice(index, 1)
}

defineExpose({ openAdd, openEdit })
</script>

<template>
  <UModal v-model:open="open" :title="mode === 'add' ? 'Add Schema' : 'Edit Schema'">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Name" orientation="horizontal"  :ui="{ description: 'text-xs' }">
          <UInput v-model="schemaForm.name" placeholder="my-schema" :disabled="mode === 'edit'" class="w-48" />
        </UFormField>
        <UFormField label="Source" orientation="horizontal"  :ui="{ description: 'text-xs' }">
          <USelect v-model="schemaForm.source" :items="sourceOptions" placeholder="Select a source" class="w-48" />
        </UFormField>
        <UFormField label="Anonymize"  orientation="horizontal" description="Comma-separated field names to anonymize in responses"  :ui="{ description: 'text-xs' }">
          <UInput v-model="schemaForm.anonymize" placeholder="email,ssn,phone" class="w-48" />
        </UFormField>
        <UFormField label="Roles" hint="Roles allowed to access this schema" orientation="horizontal">
          <div class="flex flex-wrap items-center gap-1.5 rounded-lg border border-muted bg-background px-2 py-1.5">
            <UBadge
              v-for="(role, idx) in schemaForm.roles"
              :key="idx"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ role }}
              <button class="ml-1 text-muted hover:text-error" @click="removeRole(idx)">
                <UIcon name="i-lucide-x" class="size-3" />
              </button>
            </UBadge>
            <UInput
              v-model="roleInput"
              placeholder="Add role..."
              size="sm"
              variant="none"
              class="flex-1 min-w-24"
              @keydown.enter.prevent="addRole"
              @keydown.tab.prevent="addRole"
              @keydown.backspace="onRoleBackspace"
            />
          </div>
        </UFormField>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Entities</label>
            <UButton icon="i-lucide-plus" label="Add" size="xs" variant="outline" @click="addEntity" />
          </div>
          <div v-if="schemaForm.entities.length === 0" class="text-xs text-muted italic py-2">No entities defined</div>
          <div v-for="(ent, idx) in schemaForm.entities" :key="idx" class="flex items-center gap-2">
            <UInput v-model="ent.key" placeholder="key name" class="flex-1" size="sm" />
            <UInput v-model="ent.source" placeholder="source" class="flex-1" size="sm" />
            <UInput v-model="ent.entity" placeholder="entity" class="flex-1" size="sm" />
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeEntity(idx)" />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" variant="outline" @click="() => { open = false }" />
        <UButton label="Save" @click="save" />
      </div>
    </template>
  </UModal>
</template>
