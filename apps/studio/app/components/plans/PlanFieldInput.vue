<script setup lang="ts">
import type { StepField } from '~/utils/plans/stepRegistry'
import { usePlanDocumentInjected } from '~/composables/usePlanDocument'

const props = defineProps<{ field: StepField, params: Record<string, unknown>, paramsPath?: string }>()
const model = defineModel<unknown>({ required: true })
const doc = usePlanDocumentInjected()

const schemaOptions = computed(() =>
  doc.schemas.map(schema => ({ label: schema.name, value: schema.name }))
)
function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj)
}
/** Schema name the entity field is scoped to (sibling `schema` in the same params object).
 * `paramsPath` prefixes the lookup when params are nested (e.g. `on-error.sink.entity`). */
const entitySchema = computed(() => {
  if (props.field.source !== 'entity') return undefined
  const segments = props.field.name.split('.')
  const siblingSegments = segments.map((seg, i, arr) => (i === arr.length - 1 ? 'schema' : seg))
  const siblingPath = props.paramsPath ? `${props.paramsPath}.${siblingSegments.join('.')}` : siblingSegments.join('.')
  const value = resolvePath(props.params, siblingPath)
  return typeof value === 'string' ? value : undefined
})
const entityOptions = computed(() => {
  if (!entitySchema.value) return []
  return (doc.schemas.find(schema => schema.name === entitySchema.value)?.entities ?? []).map(entity => ({
    label: entity,
    value: entity
  }))
})
const options = computed(() => {
  if (props.field.options) return props.field.options
  if (props.field.source === 'schema') return schemaOptions.value
  if (props.field.source === 'entity') return entityOptions.value
  return []
})
const currentValue = computed(() => {
  const value = model.value
  return value === undefined || value === null ? '' : String(value)
})
const selectValue = computed(() => {
  const value = model.value
  return value === undefined || value === null ? undefined : String(value)
})

function onNumberInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  model.value = raw === '' ? undefined : Number(raw)
}

const mapRows = ref<Array<{ k: string, v: string }>>([])
let lastEmitted: string | undefined
watch(
  () => [props.field.name, JSON.stringify(model.value ?? {})],
  ([, value]) => {
    if (value === lastEmitted) return
    const obj = (model.value && typeof model.value === 'object' ? model.value : {}) as Record<string, unknown>
    mapRows.value = Object.entries(obj).map(([k, v]) => ({ k, v: String(v ?? '') }))
  },
  { immediate: true }
)
function addRow() {
  mapRows.value.push({ k: '', v: '' })
}
function removeRow(index: number) {
  mapRows.value.splice(index, 1)
  commitMap()
}
function commitMap() {
  const obj: Record<string, string> = {}
  for (const row of mapRows.value) {
    if (row.k.trim()) obj[row.k.trim()] = row.v
  }
  lastEmitted = JSON.stringify(obj)
  model.value = obj
}

const isJsonField = computed(() => props.field.type === 'json')
const jsonText = ref('')
watch(
  () => model.value,
  (value) => {
    if (!isJsonField.value) return
    jsonText.value = value === undefined || value === null ? '' : JSON.stringify(value, null, 2)
  },
  { immediate: true }
)
const jsonError = ref(false)
function onJsonBlur() {
  const trimmed = jsonText.value.trim()
  if (trimmed === '') {
    model.value = undefined
    jsonError.value = false
    return
  }
  try {
    JSON.parse(trimmed)
    jsonError.value = false
    model.value = JSON.parse(trimmed)
  } catch {
    jsonError.value = true
  }
}
</script>

<template>
  <div v-if="field.source !== 'entity' || entitySchema">
    <label class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
      <span>{{ field.label }}</span>
      <span
        v-if="field.required"
        class="text-error-500"
      >*</span>
      <span
        v-if="field.expression"
        class="inline-flex items-center rounded bg-transparent px-1 text-[10px] text-primary-500"
        title="Supports JavaScript Expression Engine"
      >📜</span>
    </label>

    <USelect
      v-if="field.type === 'select'"
      :model-value="selectValue"
      :items="options"
      size="sm"
      class="w-full"
      placeholder="Select…"
      @update:model-value="model = $event"
    />

    <UInputTags
      v-else-if="field.type === 'tags'"
      :model-value="(Array.isArray(model) ? model : []) as string[]"
      placeholder="Type and press Enter"
      size="sm"
      class="w-full"
      @update:model-value="model = $event"
    />

    <USwitch
      v-else-if="field.type === 'switch'"
      :model-value="Boolean(model)"
      @update:model-value="model = $event"
    />

    <UTextarea
      v-else-if="field.type === 'textarea'"
      :model-value="currentValue"
      :placeholder="field.placeholder"
      :rows="4"
      size="sm"
      class="w-full"
      @update:model-value="model = $event"
    />

    <UInput
      v-else-if="field.type === 'number'"
      :model-value="model === undefined || model === null ? '' : String(model)"
      type="number"
      :placeholder="field.placeholder"
      size="sm"
      class="w-full"
      @input="onNumberInput"
    />

    <div v-else-if="field.type === 'map'">
      <div class="space-y-1.5">
        <div
          v-for="(row, index) in mapRows"
          :key="index"
          class="flex items-center gap-1.5"
        >
          <UInput
            v-model="row.k"
            :placeholder="field.mapKey"
            size="sm"
            class="flex-1"
            @update:model-value="commitMap"
          />
          <USelect
            v-if="field.mapOptions"
            v-model="row.v"
            :items="field.mapOptions"
            size="sm"
            class="flex-1"
            @update:model-value="commitMap"
          />
          <UInput
            v-else
            v-model="row.v"
            :placeholder="field.mapValue"
            size="sm"
            class="flex-1"
            @update:model-value="commitMap"
          />
          <UButton
            icon="i-lucide-minus"
            size="xs"
            variant="ghost"
            color="error"
            aria-label="Remove entry"
            @click="removeRow(index)"
          />
        </div>
        <UButton
          icon="i-lucide-plus"
          label="Add entry"
          size="xs"
          variant="soft"
          color="neutral"
          @click="addRow"
        />
      </div>
    </div>

    <UTextarea
      v-else-if="field.type === 'json'"
      :model-value="jsonText"
      :class="[jsonError ? 'border-error-500' : 'font-mono']"
      :rows="5"
      size="sm"
      class="w-full"
      spellcheck="false"
      placeholder="{ &quot;key&quot;: &quot;value&quot; }"
      @update:model-value="jsonText = $event"
      @blur="onJsonBlur"
    />

    <UInput
      v-else
      :model-value="currentValue"
      :placeholder="field.placeholder"
      size="sm"
      class="w-full"
      @update:model-value="model = $event"
    />

    <p
      v-if="jsonError"
      class="mt-1 text-xs text-error-500"
    >
      Invalid JSON — changes not applied.
    </p>
    <p
      v-else-if="field.hint"
      class="mt-1 text-xs text-gray-400 dark:text-gray-500"
    >
      {{ field.hint }}
    </p>
  </div>
</template>
