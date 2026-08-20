export type StepCategory = 'Data I/O'
  | 'Transform'
  | 'AI'
  | 'Flow'
  | 'Context'

export type StepColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export type StepFieldType
  = | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'tags'
  | 'switch'
  | 'textarea'
  | 'map'
  | 'kv'
  | 'json'

export type StepFieldSource = 'static' | 'schema' | 'entity'

export interface StepFieldOption {
  label: string
  value: string
}

export interface StepField {
  /** Param key; dotted paths ('from.schema') target nested objects */
  name: string
  label: string
  type: StepFieldType
  /** Static select options */
  options?: StepFieldOption[]
  /** Value source for select fields ('schema'/'entity' pull from server config) */
  source?: StepFieldSource
  placeholder?: string
  required?: boolean
  hint?: string
  /** Field supports the `${{ }}` JavaScript Expression Engine */
  expression?: boolean
  /** For 'map' fields: labels for key/value columns */
  mapKey?: string
  mapValue?: string
  /** Options for 'map' value column */
  mapOptions?: StepFieldOption[]
  /** Rows render in a table (map) */
  rows?: boolean
}

export interface StepMeta {
  key: string
  label: string
  icon: string
  color: StepColor
  category: StepCategory
  defaultParams: Record<string, unknown> | string
  formFields: StepField[]
  supportsOnError?: boolean
  supportsScopeRow?: boolean
}

/** Fields for the `on-error` block (see `U__plans_plan_on_error.ts`).
 * Retry params live under `on-error.retry.*`, sink under `on-error.sink.*`.
 * Strategy / after-retries options are made scope-dependent in StepConfigPanel.
 */
export const ON_ERROR_FIELDS: StepField[] = [
  { name: 'scope', label: 'Scope', type: 'select', options: [{ label: 'Step', value: 'step' }, { label: 'Row', value: 'row' }], hint: 'Row scope requires the step to support row-level processing' },
  { name: 'strategy', label: 'Strategy', type: 'select', options: [{ label: 'Throw', value: 'throw' }, { label: 'Skip', value: 'skip' }, { label: 'Retry', value: 'retry' }, { label: 'Sink', value: 'sink' }] },
  { name: 'retry.attempts', label: 'Retry attempts', type: 'number', hint: 'Retry strategy only' },
  { name: 'retry.delay', label: 'Retry delay (ms)', type: 'number', hint: 'Retry strategy only' },
  { name: 'retry.backoff', label: 'Backoff', type: 'select', options: [{ label: 'Fixed', value: 'fixed' }, { label: 'Linear', value: 'linear' }, { label: 'Exponential', value: 'exponential' }], hint: 'Retry strategy only' },
  { name: 'retry.max-delay', label: 'Max delay (ms)', type: 'number', hint: 'Retry strategy only' },
  { name: 'retry.after-retries', label: 'After retries', type: 'select', options: [{ label: 'Throw', value: 'throw' }, { label: 'Skip', value: 'skip' }, { label: 'Sink', value: 'sink' }], hint: 'Retry strategy only' },
  { name: 'sink.schema', label: 'Sink schema', type: 'select', source: 'schema', required: true, hint: 'Sink strategy only' },
  { name: 'sink.entity', label: 'Sink entity', type: 'select', source: 'entity', required: true, hint: 'Sink strategy only' },
  { name: 'sink.include-error', label: 'Include error details', type: 'switch', hint: 'Sink strategy only' },
  { name: 'sink.error-field', label: 'Error field name', type: 'text', hint: 'Sink strategy only' }
]

const JOIN_TYPES = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Inner', value: 'inner' },
  { label: 'Full Outer', value: 'full-outer' },
  { label: 'Cross', value: 'cross' }
]

const SORT_DIRECTIONS = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' }
]

const DEDUPE_METHODS = [
  { label: 'Hash', value: 'hash' },
  { label: 'Exact', value: 'exact' },
  { label: 'Ignore case', value: 'ignorecase' }
]

const DEDUPE_STRATEGIES = [
  { label: 'First', value: 'first' },
  { label: 'Last', value: 'last' },
  { label: 'Lowest', value: 'lowest' },
  { label: 'Highest', value: 'highest' },
  { label: 'Custom', value: 'custom' }
]

/** Metadata for every step command, ordered as shown in the palette */
export const STEP_REGISTRY: StepMeta[] = [
  {
    key: 'select',
    label: 'Select',
    icon: 'i-lucide-arrow-down-to-line',
    color: 'info',
    category: 'Data I/O',
    supportsOnError: true,
    defaultParams: {},
    formFields: [
      { name: 'schema', label: 'Schema', type: 'select', source: 'schema', expression: true },
      { name: 'entity', label: 'Entity', type: 'select', source: 'entity', expression: true },
      { name: 'fields', label: 'Fields', type: 'text', placeholder: 'id, name, email', hint: 'Comma separated field names', expression: true },
      { name: 'filter', label: 'Filter', type: 'kv', placeholder: 'field', hint: 'Add field:value conditions', expression: true },
      { name: 'filter-expression', label: 'Filter expression', type: 'text', expression: true, hint: 'Free form SQL-like condition' },
      { name: 'sort', label: 'Sort', type: 'kv', placeholder: 'field', mapOptions: SORT_DIRECTIONS, hint: 'Add field:direction pairs', expression: true },
      { name: 'limit', label: 'Limit', type: 'number', expression: true },
      { name: 'offset', label: 'Offset', type: 'number', expression: true },
      { name: 'cache', label: 'Cache (s)', type: 'number', hint: 'Cache duration in seconds', expression: true }
    ]
  },
  {
    key: 'insert',
    label: 'Insert',
    icon: 'i-lucide-arrow-up-from-line',
    color: 'info',
    category: 'Data I/O',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'schema', label: 'Schema', type: 'select', source: 'schema', expression: true },
      { name: 'entity', label: 'Entity', type: 'select', source: 'entity', expression: true },
      { name: 'data', label: 'Data', type: 'json', hint: 'Object or array of rows to insert. Empty to use plan data', expression: true }
    ]
  },
  {
    key: 'update',
    label: 'Update',
    icon: 'i-lucide-pencil',
    color: 'info',
    category: 'Data I/O',
    supportsOnError: true,
    defaultParams: {},
    formFields: [
      { name: 'schema', label: 'Schema', type: 'select', source: 'schema', expression: true },
      { name: 'entity', label: 'Entity', type: 'select', source: 'entity', expression: true },
      { name: 'filter', label: 'Filter', type: 'kv', placeholder: 'field', hint: 'Add field:value conditions', expression: true },
      { name: 'filter-expression', label: 'Filter expression', type: 'text', expression: true },
      { name: 'data', label: 'Data', type: 'json', hint: 'Field values to update', expression: true }
    ]
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'info',
    category: 'Data I/O',
    supportsOnError: true,
    defaultParams: {},
    formFields: [
      { name: 'schema', label: 'Schema', type: 'select', source: 'schema', expression: true },
      { name: 'entity', label: 'Entity', type: 'select', source: 'entity', expression: true },
      { name: 'filter', label: 'Filter', type: 'kv', placeholder: 'field', hint: 'Add field:value conditions', expression: true },
      { name: 'filter-expression', label: 'Filter expression', type: 'text', expression: true }
    ]
  },
  {
    key: 'list-entities',
    label: 'List entities',
    icon: 'i-lucide-list-tree',
    color: 'info',
    category: 'Data I/O',
    supportsOnError: true,
    defaultParams: {},
    formFields: [
      { name: 'schema', label: 'Schema', type: 'select', source: 'schema', expression: true }
    ]
  },
  {
    key: 'join',
    label: 'Join',
    icon: 'i-lucide-merge',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    defaultParams: { type: 'left' },
    formFields: [
      { name: 'schema', label: 'Schema', type: 'select', source: 'schema', expression: true },
      { name: 'entity', label: 'Entity', type: 'select', source: 'entity', expression: true },
      { name: 'type', label: 'Type', type: 'select', options: JOIN_TYPES, expression: true },
      { name: 'left-field', label: 'Left field', type: 'text', expression: true },
      { name: 'right-field', label: 'Right field', type: 'text', expression: true }
    ]
  },
  {
    key: 'sort',
    label: 'Sort',
    icon: 'i-lucide-arrow-down-a-z',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    defaultParams: {},
    formFields: [
      { name: 'fields', label: 'Fields', type: 'map', mapKey: 'Field', mapValue: 'Direction', mapOptions: SORT_DIRECTIONS, rows: true, expression: true }
    ]
  },
  {
    key: 'pick',
    label: 'Pick',
    icon: 'i-lucide-check-square',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'fields', label: 'Fields to keep', type: 'tags', hint: 'Add one field per entry' }
    ]
  },
  {
    key: 'omit',
    label: 'Omit',
    icon: 'i-lucide-square-slash',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'fields', label: 'Fields to remove', type: 'tags', hint: 'Add one field per entry' }
    ]
  },
  {
    key: 'map',
    label: 'Map',
    icon: 'i-lucide-code-2',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'script', label: 'Script', type: 'textarea', required: true, hint: 'JS executed per row ($row). A `return $row;` is appended automatically.' }
    ]
  },
  {
    key: 'set-var',
    label: 'Set variable',
    icon: 'i-lucide-variable',
    color: 'success',
    category: 'Context',
    defaultParams: {},
    formFields: [
      { name: '', label: 'Variables', type: 'map', mapKey: 'Name', mapValue: 'Value', hint: 'Accessible as $vars.name' }
    ]
  },
  {
    key: 'run',
    label: 'Run AI task',
    icon: 'i-lucide-sparkles',
    color: 'primary',
    category: 'AI',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'ai', label: 'AI engine', type: 'text', expression: true },
      { name: 'task', label: 'Task', type: 'text', expression: true },
      { name: 'params', label: 'Params', type: 'json' },
      { name: 'input', label: 'Input field', type: 'text', expression: true },
      { name: 'output', label: 'Output', type: 'map', mapKey: 'Field', mapValue: 'Result property', hint: 'Field → $result property mapping' }
    ]
  },
  {
    key: 'sync',
    label: 'Sync',
    icon: 'i-lucide-repeat-2',
    color: 'info',
    category: 'Data I/O',
    supportsOnError: true,
    defaultParams: {},
    formFields: [
      { name: 'from.schema', label: 'From schema', type: 'select', source: 'schema', expression: true },
      { name: 'from.entity', label: 'From entity', type: 'select', source: 'entity', expression: true },
      { name: 'to.schema', label: 'To schema', type: 'select', source: 'schema', expression: true },
      { name: 'to.entity', label: 'To entity', type: 'select', source: 'entity', expression: true },
      { name: 'id', label: 'Identity field', type: 'text', expression: true, hint: 'Field used as unique identity for the sync' }
    ]
  },
  {
    key: 'anonymize',
    label: 'Anonymize',
    icon: 'i-lucide-eye-off',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'fields', label: 'Fields', type: 'tags', hint: 'Add one field per entry' }
    ]
  },
  {
    key: 'remove-duplicates',
    label: 'Remove duplicates',
    icon: 'i-lucide-copy-x',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    defaultParams: { method: 'hash', strategy: 'first' },
    formFields: [
      { name: 'key', label: 'Key fields', type: 'tags', hint: 'Fields used for comparison (empty = whole row)' },
      { name: 'method', label: 'Method', type: 'select', options: DEDUPE_METHODS },
      { name: 'strategy', label: 'Strategy', type: 'select', options: DEDUPE_STRATEGIES },
      { name: 'condition', label: 'Condition', type: 'text', hint: 'Field name for lowest/highest, SQL predicate for custom' }
    ]
  },
  {
    key: 'remove-empty-fields',
    label: 'Remove empty fields',
    icon: 'i-lucide-eraser',
    color: 'warning',
    category: 'Transform',
    supportsOnError: true,
    supportsScopeRow: true,
    defaultParams: {},
    formFields: [
      { name: 'defaults', label: 'Defaults', type: 'json', hint: 'Criterion applied to all fields (null, empty-string, blank-string, zero, false, ...)' },
      { name: 'fields', label: 'Fields', type: 'json', hint: 'Field-specific criterion overriding defaults' }
    ]
  },
  {
    key: 'clear',
    label: 'Clear',
    icon: 'i-lucide-ban',
    color: 'warning',
    category: 'Transform',
    defaultParams: '',
    formFields: []
  },
  {
    key: 'debug',
    label: 'Debug',
    icon: 'i-lucide-bug',
    color: 'neutral',
    category: 'Flow',
    defaultParams: '',
    formFields: []
  },
  {
    key: 'break',
    label: 'Break',
    icon: 'i-lucide-circle-stop',
    color: 'neutral',
    category: 'Flow',
    defaultParams: '',
    formFields: [
      { name: '', label: 'Condition', type: 'text', placeholder: 'Empty or ${{ expression }}', hint: 'Stop execution when the expression is truthy' }
    ]
  }
]

export const STEP_REGISTRY_MAP: Record<string, StepMeta> = Object.fromEntries(STEP_REGISTRY.map(meta => [meta.key, meta]))

export const STEP_CATEGORIES: StepCategory[] = ['Data I/O', 'Transform', 'AI', 'Flow', 'Context']

export function getStepMeta(stepKey: string): StepMeta {
  return STEP_REGISTRY_MAP[stepKey] ?? {
    key: stepKey,
    label: stepKey,
    icon: 'i-lucide-help-circle',
    color: 'neutral',
    category: 'Flow',
    defaultParams: {},
    formFields: []
  }
}
