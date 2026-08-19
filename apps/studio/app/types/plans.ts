import type { Edge, Node } from '@vue-flow/core'
import type { StepColor } from '~/utils/plans/stepRegistry'

/** Step params: an object, or a plain string (e.g. `break`/`debug` conditions), or null on the server */
export type TStepParams = Record<string, unknown> | string

/** A plan step: `{ [stepKey]: params }` (mirrors `U__plans_plan__step` on the server) */
export type TStep = Record<string, TStepParams | null>

/** A full plan item as stored in config.yml `plans` section */
export type TPlanItem = {
  'steps': TStep[]
  'on-error'?: Record<string, unknown>
  'failure-strategy'?: string
}

/** Lightweight plan entry for the list panel */
export type TPlanSummary = {
  name: string
  stepsCount: number
}

/** Internal node model: source of truth between the plan steps array and the canvas */
export type TStepEntry = {
  id: string
  stepKey: string
  params: TStepParams
}

/** Data attached to every Vue Flow step node */
export type TPlanNodeData = {
  stepKey: string
  stepName: string
  category: string
  color: StepColor
  icon: string
  params: TStepParams
}

export type TPlanNode = Node<TPlanNodeData>
export type TPlanEdge = Edge

/** A declared schema from config (used by schema/entity pickers) */
export type TSchemaInfo = {
  name: string
  entities: string[]
}
