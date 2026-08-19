import { MarkerType } from '@vue-flow/core'
import type { Edge, Node } from '@vue-flow/core'
import type { UnwrapRef } from 'vue'
import type { TPlanItem, TPlanNodeData, TPlanSummary, TSchemaInfo, TStep, TStepEntry, TStepParams } from '~/types/plans'
import { getStepMeta } from '~/utils/plans/stepRegistry'

export const PLAN_DOCUMENT_KEY = Symbol('plan-document')

export const NODE_W = 260
export const NODE_H = 160
export const GAP = 48
export const START_X = 40
export const START_Y = 40

const API_PREFIX = '/server-api/api/config'

export type PlanDocument = UnwrapRef<ReturnType<typeof usePlanDocument>>

/** Extract a readable message from $fetch/server errors */
function errorMessage(err: unknown): string {
  const candidate = err as { data?: { message?: unknown }, message?: unknown } | undefined
  const message = candidate?.data?.message ?? candidate?.message
  return typeof message === 'string' ? message : String(err)
}

/** Deep-plain clone. `structuredClone` throws on Vue reactive proxies, and params are JSON-only data. */
export function clonePlain<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value)) as T
}

export function usePlanDocument() {
  const plans = ref<TPlanSummary[]>([])
  const schemas = ref<TSchemaInfo[]>([])
  const currentPlanName = ref('')
  const planMeta = ref<{ 'on-error'?: Record<string, unknown>, 'failure-strategy'?: string }>({})
  const entries = ref<TStepEntry[]>([])
  const flowNodes = shallowRef<Array<Node<TPlanNodeData>>>([])
  const flowEdges = shallowRef<Edge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const dirty = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const error = ref<string | null>(null)

  let nodeSeq = 0

  const stepCount = computed(() => entries.value.length)
  const selectedEntry = computed(() => entries.value.find(entry => entry.id === selectedNodeId.value))

  /** Build Vue Flow nodes/edges from the ordered step entries (vertical top→bottom) */
  function buildGraph() {
    const nodes: Array<Node<TPlanNodeData>> = entries.value.map((entry, index) => {
      const meta = getStepMeta(entry.stepKey)
      return {
        id: entry.id,
        type: 'step',
        position: { x: START_X, y: START_Y + index * (NODE_H + GAP) },
        width: NODE_W,
        data: {
          stepKey: entry.stepKey,
          stepName: meta.label,
          category: meta.category,
          color: meta.color,
          icon: meta.icon,
          params: entry.params
        }
      }
    })

    const edges: Edge[] = []
    for (let index = 0; index < entries.value.length - 1; index++) {
      edges.push({
        id: `edge-${index}`,
        source: entries.value[index]!.id,
        target: entries.value[index + 1]!.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 }
      })
    }

    flowNodes.value = nodes
    flowEdges.value = edges
  }

  function parseStep(step: TStep): { stepKey: string, params: TStepParams } {
    const [stepKey, rawParams] = Object.entries(step)[0] ?? ['select', {}]
    if (rawParams === null || rawParams === undefined) return { stepKey, params: '' }
    if (typeof rawParams === 'string') return { stepKey, params: rawParams }
    return { stepKey, params: { ...rawParams } }
  }

  function resetPlan() {
    entries.value = []
    planMeta.value = {}
    selectedNodeId.value = null
    dirty.value = false
    error.value = null
    saveStatus.value = 'idle'
    buildGraph()
  }

  /** Load the plan list from the config API */
  async function loadPlans() {
    try {
      const section = await $fetch<Record<string, TPlanItem>>(`${API_PREFIX}/plans`)
      plans.value = Object.entries(section ?? {}).map(([name, item]) => ({
        name,
        stepsCount: Array.isArray(item?.steps) ? item.steps.length : 0
      }))
    } catch (err) {
      plans.value = []
      error.value = `Failed to load plans: ${errorMessage(err)}`
    }
  }

  /** Load schema/entity metadata for pickers. The config section only holds source
   * definitions, so entities are resolved per schema via `GET /schema/:name`. */
  async function listSchemaEntities(name: string): Promise<string[]> {
    try {
      const response = await $fetch<{ rows?: Array<Record<string, unknown>> }>(`/server-api/schema/${encodeURIComponent(name)}`)
      return (response?.rows ?? [])
        .map(row => (row?.['name'] as string | undefined))
        .filter((entity): entity is string => typeof entity === 'string')
    } catch {
      return []
    }
  }

  async function loadSchemas() {
    try {
      const section = await $fetch<Record<string, unknown>>(`${API_PREFIX}/schemas`)
      const names = Object.keys(section ?? {})
      const withEntities = await Promise.all(names.map(async name => ({
        name,
        entities: await listSchemaEntities(name)
      })))
      schemas.value = withEntities
    } catch {
      schemas.value = []
    }
  }

  /** Load a single plan into the editor */
  async function loadPlan(name: string) {
    loading.value = true
    error.value = null
    try {
      const item = await $fetch<TPlanItem>(`${API_PREFIX}/plans/${encodeURIComponent(name)}`)
      const steps = Array.isArray(item?.steps) ? item.steps : []
      entries.value = steps.map((step) => {
        const { stepKey, params } = parseStep(step)
        nodeSeq += 1
        return { id: `step-${nodeSeq}`, stepKey, params }
      })
      planMeta.value = {
        'on-error': item?.['on-error'],
        'failure-strategy': item?.['failure-strategy']
      }
      currentPlanName.value = name
      selectedNodeId.value = null
      dirty.value = false
      saveStatus.value = 'idle'
      buildGraph()
    } catch (err) {
      error.value = `Failed to load plan: ${errorMessage(err)}`
    } finally {
      loading.value = false
    }
  }

  /** Prepare an empty local plan (persisted on next save) */
  function createPlan(name: string) {
    nodeSeq = 0
    currentPlanName.value = name
    planMeta.value = {}
    entries.value = []
    selectedNodeId.value = null
    dirty.value = true
    error.value = null
    saveStatus.value = 'idle'
    buildGraph()
  }

  /** Delete a plan from the config API */
  async function deletePlan(name: string) {
    try {
      await $fetch(`${API_PREFIX}/plans/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (currentPlanName.value === name) {
        currentPlanName.value = ''
        resetPlan()
      }
      await loadPlans()
    } catch (err) {
      error.value = `Failed to delete plan: ${errorMessage(err)}`
    }
  }

  /** Persist the current plan and reload the server config */
  async function save() {
    if (!currentPlanName.value) return
    saving.value = true
    error.value = null
    saveStatus.value = 'saving'
    const body: TPlanItem = {
      steps: entries.value.map(entry => ({
        [entry.stepKey]: typeof entry.params === 'string' && entry.params === '' ? null : entry.params
      }))
    }
    if (planMeta.value['on-error'] !== undefined) body['on-error'] = planMeta.value['on-error']
    if (planMeta.value['failure-strategy'] !== undefined) body['failure-strategy'] = planMeta.value['failure-strategy']
    try {
      await $fetch(`${API_PREFIX}/plans/${encodeURIComponent(currentPlanName.value)}`, { method: 'PUT', body })
      await $fetch(`${API_PREFIX}/reload`, { method: 'POST' })
      dirty.value = false
      saveStatus.value = 'saved'
      await loadPlans()
    } catch (err) {
      saveStatus.value = 'error'
      error.value = `Failed to save plan: ${errorMessage(err)}`
    } finally {
      saving.value = false
    }
  }

  /** Insert a step. index undefined = append at the end */
  function addStep(stepKey: string, index?: number) {
    nodeSeq += 1
    const meta = getStepMeta(stepKey)
    const entry: TStepEntry = {
      id: `step-${nodeSeq}`,
      stepKey,
      params: clonePlain(meta.defaultParams)
    }
    if (index === undefined || index >= entries.value.length) entries.value.push(entry)
    else entries.value.splice(index, 0, entry)
    selectedNodeId.value = entry.id
    dirty.value = true
    buildGraph()
    return entry.id
  }

  function removeStep(id: string) {
    const index = entries.value.findIndex(entry => entry.id === id)
    if (index === -1) return
    entries.value.splice(index, 1)
    if (selectedNodeId.value === id) selectedNodeId.value = null
    dirty.value = true
    buildGraph()
  }

  /** Move a step by a relative delta (-1 / +1) */
  function moveStep(id: string, delta: number) {
    const index = entries.value.findIndex(entry => entry.id === id)
    const target = index + delta
    if (index === -1 || target < 0 || target >= entries.value.length) return
    const [entry] = entries.value.splice(index, 1)
    entries.value.splice(target, 0, entry!)
    dirty.value = true
    buildGraph()
  }

  /** Snap a dragged node to the nearest slot (by y) and re-sort */
  function snapNode(id: string, y: number) {
    const index = entries.value.findIndex(entry => entry.id === id)
    if (index === -1) return
    const slot = Math.min(
      Math.max(Math.round((y - START_Y) / (NODE_H + GAP)), 0),
      entries.value.length - 1
    )
    if (slot === index) {
      buildGraph()
      return
    }
    const [entry] = entries.value.splice(index, 1)
    entries.value.splice(slot, 0, entry!)
    dirty.value = true
    buildGraph()
  }

  function updateParams(id: string, params: TStepParams) {
    const entry = entries.value.find(e => e.id === id)
    if (!entry) return
    entry.params = params
    dirty.value = true
  }

  function setSelected(id: string | null) {
    selectedNodeId.value = id
  }

  function setPlanMeta(meta: { 'on-error'?: Record<string, unknown>, 'failure-strategy'?: string }) {
    planMeta.value = meta
    dirty.value = true
  }

  function clearError() {
    error.value = null
  }

  return {
    plans,
    schemas,
    currentPlanName,
    planMeta,
    entries,
    flowNodes,
    flowEdges,
    selectedNodeId,
    selectedEntry,
    stepCount,
    dirty,
    loading,
    saving,
    saveStatus,
    error,
    loadPlans,
    loadSchemas,
    loadPlan,
    createPlan,
    deletePlan,
    save,
    addStep,
    removeStep,
    moveStep,
    snapNode,
    updateParams,
    setSelected,
    setPlanMeta,
    resetPlan,
    clearError
  }
}

/** Child components inject the document instance created by PlanDesigner */
export function usePlanDocumentInjected(): PlanDocument {
  const doc = inject<PlanDocument>(PLAN_DOCUMENT_KEY)
  if (!doc) throw new Error('usePlanDocumentInjected must be used within <PlanDesigner>')
  return doc
}
