<script setup lang="ts">
import { ON_ERROR_FIELDS, getStepMeta, type StepField } from '~/utils/plans/stepRegistry'
import { clonePlain, usePlanDocumentInjected } from '~/composables/usePlanDocument'
import type { TStepParams } from '~/types/plans'
import PlanFieldInput from './PlanFieldInput.vue'

const doc = usePlanDocumentInjected()

const entry = computed(() => doc.selectedEntry)
const meta = computed(() => (entry.value ? getStepMeta(entry.value.stepKey) : null))
const stepIndex = computed(() => (entry.value ? doc.entries.findIndex(e => e.id === entry.value!.id) : -1))
const stepCount = computed(() => doc.entries.length)
/** Whole params value (object or string) */
const params = computed(() => (entry.value ? entry.value.params : {}))
/** Object-form params for field editing */
const paramsObj = computed<Record<string, unknown>>(() => {
  const p = entry.value?.params
  return p && typeof p === 'object' ? p : {}
})

const tab = ref<'form' | 'json'>('form')
const tabItems = [
  { value: 'form', label: 'Form' },
  { value: 'json', label: 'JSON' }
]

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj)
}
function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = obj
  for (let index = 0; index < keys.length - 1; index++) {
    const key = keys[index]!
    if (typeof current[key] !== 'object' || current[key] === null) current[key] = {}
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]!] = value
}

function setParam(path: string, value: unknown) {
  if (!entry.value) return
  const next = clonePlain(paramsObj.value)
  setPath(next, path, value)
  doc.updateParams(entry.value.id, next)
}

const hasFilter = computed(() => meta.value?.formFields.some(f => f.name === 'filter' || f.name === 'filter-expression') ?? false)
const filterMode = computed({
  get: () => {
    const value = getPath(paramsObj.value, '_filter-mode')
    return value === 'expression' ? 'expression' : 'kv'
  },
  set: (value: string) => {
    if (!entry.value) return
    const next = clonePlain(paramsObj.value)
    setPath(next, '_filter-mode', value)
    if (value === 'kv') setPath(next, 'filter-expression', undefined)
    if (value === 'expression') setPath(next, 'filter', undefined)
    doc.updateParams(entry.value.id, next)
  }
})

const RETRY_PREFIX = 'retry.'
const SINK_PREFIX = 'sink.'

const canSupportScopeRow = computed(() => meta.value?.supportsScopeRow === true)

const onErrorScope = computed(() => {
  const value = getPath(paramsObj.value, 'on-error.scope')
  return typeof value === 'string' ? value : undefined
})
const onErrorStrategy = computed(() => {
  const value = getPath(paramsObj.value, 'on-error.strategy')
  return typeof value === 'string' ? value : undefined
})

/** Scope-dependent `on-error` fields. The server schema (`U__plans_plan_on_error.ts`)
 * discriminates on `strategy`: throw ⇒ step only, sink ⇒ row only, retry ⇒ step|row,
 * and after-retries excludes sink at step scope / throw at row scope. */
const onErrorFields = computed<StepField[]>(() => {
  const scope = canSupportScopeRow.value ? onErrorScope.value : 'step'
  const strategy = onErrorStrategy.value
  const afterRetries = getPath(paramsObj.value, 'on-error.retry.after-retries')
  const showRetry = strategy === 'retry'
  const showSink = strategy === 'sink' || (strategy === 'retry' && scope === 'row' && afterRetries === 'sink')
  const strategyOptions = scope === 'row'
    ? [{ label: 'Skip', value: 'skip' }, { label: 'Retry', value: 'retry' }, { label: 'Sink', value: 'sink' }]
    : [{ label: 'Throw', value: 'throw' }, { label: 'Skip', value: 'skip' }, { label: 'Retry', value: 'retry' }]
  const afterRetriesOptions = scope === 'row'
    ? [{ label: 'Skip', value: 'skip' }, { label: 'Sink', value: 'sink' }]
    : [{ label: 'Throw', value: 'throw' }, { label: 'Skip', value: 'skip' }]
  return ON_ERROR_FIELDS
    .filter((field) => {
      if (field.name === 'scope') return canSupportScopeRow.value
      if (field.name.startsWith(RETRY_PREFIX)) return showRetry
      if (field.name.startsWith(SINK_PREFIX)) return showSink
      return true
    })
    .map((field) => {
      if (field.name === 'strategy') return { ...field, options: strategyOptions }
      if (field.name === 'retry.after-retries') return { ...field, options: afterRetriesOptions }
      return field
    })
})

/** Update an on-error field, auto-correcting scope/strategy to a supported combination. */
function setOnError(name: string, value: unknown) {
  if (!entry.value) return
  const next = clonePlain(paramsObj.value)
  setPath(next, `on-error.${name}`, value)
  const desiredScope = name === 'scope' ? value : getPath(next, 'on-error.scope')
  const desiredStrategy = name === 'strategy' ? value : getPath(next, 'on-error.strategy')
  let strategy = desiredStrategy
  if (desiredScope === 'row' && strategy === 'throw') strategy = 'skip'
  if (desiredScope === 'step' && strategy === 'sink') strategy = 'throw'
  let scope = desiredScope
  if (strategy === 'throw') scope = 'step'
  if (strategy === 'sink') scope = 'row'
  if (!canSupportScopeRow.value && scope === 'row') scope = 'step'
  if (!canSupportScopeRow.value && strategy === 'sink') strategy = 'throw'
  if (strategy !== undefined) setPath(next, 'on-error.strategy', strategy)
  if (scope !== undefined) setPath(next, 'on-error.scope', scope)
  const afterRetries = getPath(next, 'on-error.retry.after-retries')
  if (scope === 'step' && afterRetries === 'sink') setPath(next, 'on-error.retry.after-retries', 'throw')
  if (scope === 'row' && afterRetries === 'throw') setPath(next, 'on-error.retry.after-retries', 'skip')
  doc.updateParams(entry.value.id, next)
}

/** Empty-name fields edit the whole params object (e.g. set-var map, break condition) */
function isWholeParamsField(field: StepField) {
  return field.name === ''
}

const jsonText = ref('')
watch(
  () => params.value,
  (value) => {
    if (tab.value === 'json') return
    jsonText.value = value ? JSON.stringify(value, null, 2) : ''
  },
  { deep: true }
)
watch(tab, (value) => {
  if (value === 'json' && entry.value) {
    jsonText.value = params.value ? JSON.stringify(params.value, null, 2) : ''
  }
})
const jsonError = ref(false)
function applyJson() {
  try {
    const parsed = JSON.parse(jsonText.value)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not-an-object')
    if (entry.value) doc.updateParams(entry.value.id, parsed as Record<string, unknown>)
    jsonError.value = false
  } catch {
    jsonError.value = true
  }
}

/** Filter form fields based on _filter-mode: show filter or filter-expression exclusively */
const visibleFormFields = computed(() => {
  if (!meta.value) return []
  return meta.value.formFields.filter((field) => {
    if (field.name === 'filter' && filterMode.value === 'expression') return false
    if (field.name === 'filter-expression' && filterMode.value === 'kv') return false
    return true
  })
})

function onDelete() {
  if (entry.value) doc.removeStep(entry.value.id)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <template v-if="entry && meta">
      <div class="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg text-primary-500 bg-primary-500/10">
            <UIcon
              :name="meta.icon"
              class="h-4 w-4"
            />
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ meta.label }}
            </p>
            <p class="font-mono text-[11px] text-gray-400 dark:text-gray-500">
              {{ entry.stepKey }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <UBadge
            :label="`Step ${stepIndex + 1} of ${stepCount}`"
            color="neutral"
            variant="soft"
            size="sm"
          />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            variant="ghost"
            color="error"
            aria-label="Remove step"
            @click="onDelete"
          />
        </div>
      </div>

      <div class="border-b border-gray-100 px-4 pt-2 dark:border-gray-800">
        <UTabs
          v-model="tab"
          :items="tabItems"
          size="sm"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <template v-if="tab === 'form'">
          <div class="space-y-4">
            <template v-for="(field, idx) in visibleFormFields" :key="field.name || '__params__'">
              <div
                v-if="hasFilter && (field.name === 'filter' || field.name === 'filter-expression') && (idx === 0 || (visibleFormFields[idx - 1]?.name !== 'filter' && visibleFormFields[idx - 1]?.name !== 'filter-expression'))"
                class="flex items-center gap-2"
              >
                <span class="text-xs text-gray-400 dark:text-gray-500">Filter:</span>
                <UTabs
                  v-model="filterMode"
                  :items="[{ value: 'kv', label: 'Key : Value' }, { value: 'expression', label: 'Expression' }]"
                  size="xs"
                />
              </div>
              <PlanFieldInput
                v-if="field.name !== '_filter-mode'"
                :field="field"
                :params="paramsObj"
                :model-value="isWholeParamsField(field) ? params : getPath(paramsObj, field.name)"
                @update:model-value="isWholeParamsField(field) ? doc.updateParams(entry.id, $event as TStepParams) : setParam(field.name, $event)"
              />
            </template>
          </div>

          <template v-if="meta.supportsOnError">
            <USeparator class="my-5" />
            <p class="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <UIcon
                name="i-lucide-shield-alert"
                class="h-3.5 w-3.5"
              />
              On error
            </p>
            <div class="space-y-4">
              <PlanFieldInput
                v-for="field in onErrorFields"
                :key="`on-error-${field.name}`"
                :field="field"
                :params="paramsObj"
                params-path="on-error"
                :model-value="getPath(paramsObj, `on-error.${field.name}`)"
                @update:model-value="setOnError(field.name, $event)"
              />
            </div>
          </template>
        </template>

        <template v-else>
          <div class="flex flex-col gap-3">
            <UTextarea
              v-model="jsonText"
              :class="[jsonError ? 'border-error-500' : 'font-mono']"
              :rows="18"
              size="sm"
              class="w-full"
              spellcheck="false"
              placeholder="{ }"
            />
            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-check"
                label="Apply"
                color="primary"
                size="sm"
                @click="applyJson"
              />
              <p
                v-if="jsonError"
                class="text-xs text-error-500"
              >
                Invalid JSON — must be an object.
              </p>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template v-else>
      <div class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <UIcon
            name="i-lucide-sliders-horizontal"
            class="h-6 w-6"
          />
        </div>
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          No step selected
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Select a node on the canvas, drop a step from the palette, or click “Add step”.
        </p>
      </div>
    </template>
  </div>
</template>
