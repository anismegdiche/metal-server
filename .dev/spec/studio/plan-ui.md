# Studio — Visual ETL Plan Designer — v1

## 1. Overview

A **visual plan designer** for the Metal Studio (`apps/studio`, Nuxt 4 + `@nuxt/ui` v4). Plans are **strictly sequential** ETL pipelines — an ordered list of steps `[{ stepName: params }]` that run one after another, each consuming the previous step's data table (see `config.yml` docs — `plans` section, and `U__plans_plan__step.ts`).

The designer uses a **node-canvas editor powered by Vue Flow** (`@vue-flow/core`), the Vue 3 port of React Flow (MIT, TypeScript — the engine behind n8n's editor). Because execution is sequential, edges are **auto-chained** between consecutive nodes; there is no free-form connecting. A **left panel** hosts the plan list (top) and a **step palette** (bottom) for drag-and-drop insertion.

Current state: `/designer` is a static mockup (a row of hardcoded `UCard`s with arrow icons). This spec replaces it with a functional editor wired to the real config API.

---

## 2. Goals / Non-Goals

### Goals
- Visually create, edit, reorder, and delete plan steps on a canvas.
- Add steps by dragging from a step palette (left panel).
- Edit each step's params via a generated **Form** and a raw **Advanced JSON** tab.
- Round-trip plans with the server config (`GET/PUT /api/config/plans/:name` + reload).
- Match the existing 3-pane studio design language (`@nuxt/ui` v4, `i-lucide-*` icons, dark/light mode).

### Non-Goals
- Free-form graph editing (branching, arbitrary connections) — plans are linear.
- YAML editing in the studio — advanced editing is JSON (the server stores plan objects itself).
- Plan scheduling UI (covered by `/scheduler`) or execution monitoring (covered by `/dashboard/plans`).

---

## 3. Layout

Three panes, filling the page height:

```
┌──────────────┬──────────────────────────────┬──────────────────────┐
│ LEFT PANEL   │ CENTER (Vue Flow canvas)     │ RIGHT PANEL          │
│ Plan list    │  (nodes + auto-chained edges,│ Step config inspector│
│ (top)        │   minimap, controls, pan/    │  - Form tab          │
│ Step palette │   zoom, background grid)     │  - Advanced JSON tab │
│ (bottom,     │                              │                      │
│  draggable)  │                              │                      │
└──────────────┴──────────────────────────────┴──────────────────────┘
```

- **Left panel** (`w-1/5`, resizable): plan list (select/create/rename/delete) + step palette (grouped by category, items are HTML5 `draggable`).
- **Center**: `<VueFlow>` canvas with custom `StepNode` components, auto-chained edges, `<Background>`, `<Controls>`, `<Minimap>`.
- **Right panel** (`w-1/4`): config inspector shown when a node is selected; otherwise a placeholder with plan-level info (name, step count, Run/Save actions).

---

## 4. Dependencies

```
yarn workspace @metal/studio add @vue-flow/core @vue-flow/background @vue-flow/controls @vue-flow/minimap
```

| Package                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `@vue-flow/core`       | Canvas, nodes/edges, pan/zoom, drag, custom nodes |
| `@vue-flow/background` | Dotted/grid background                            |
| `@vue-flow/controls`   | Zoom in/out/fit buttons                           |
| `@vue-flow/minimap`    | Mini navigation map                               |

No YAML library is required — the Advanced tab is JSON and the server persists plan objects itself.

---

## 5. Data Model

### 5.1 Types (`app/types/plans.ts`)

```ts
type TStep = { [stepName: string]: Record<string, unknown> }        // mirrors U__plans_plan__step

type TPlan = {
  name: string
  onError?: Record<string, unknown>      // plan-level on-error (optional)
  failureStrategy?: string               // 'data' | 'data-errors' | 'throw' (default 'throw')
  steps: TStep[]
}

type TPlanNodeData = {
  stepKey: string                        // e.g. 'select'
  stepName: string                       // human label
  params: Record<string, unknown>        // current step params (live-edited)
  category: string
  color: string
  icon: string
}

type TPlanNode = {
  id: string                             // stable id: `${stepKey}:${index}` (see 6.1)
  type: 'step'
  position: { x: number; y: number }
  data: TPlanNodeData
}

type TPlanEdge = {
  id: string
  source: string
  target: string
  type: 'smoothstep'
  animated?: boolean
}
```

### 5.2 Step registry (`app/utils/plans/stepRegistry.ts`)

Single source of truth describing every step command. Driven from the server `STEP` enum + the `config.yml` docs (`plans.steps`):

| stepKey               | category  | icon                          | formFields (short)                                                                                         |
| --------------------- | --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `select`              | Data I/O  | `i-lucide-arrow-down-to-line` | schema, entity, fields, filter, filter-expression, sort, limit, offset, cache                              |
| `insert`              | Data I/O  | `i-lucide-arrow-up-from-line` | schema, entity, data                                                                                       |
| `update`              | Data I/O  | `i-lucide-pencil`             | schema, entity, filter, filter-expression, data                                                            |
| `delete`              | Data I/O  | `i-lucide-trash-2`            | schema, entity, filter, filter-expression                                                                  |
| `list-entities`       | Data I/O  | `i-lucide-list-tree`          | schema                                                                                                     |
| `join`                | Transform | `i-lucide-git-branch`         | schema, entity, type, left-field, right-field                                                              |
| `sort`                | Transform | `i-lucide-arrow-down-a-z`     | fields (map)                                                                                               |
| `pick`                | Transform | `i-lucide-check-square`       | fields (array)                                                                                             |
| `omit`                | Transform | `i-lucide-square-slash`       | fields (array)                                                                                             |
| `map`                 | Transform | `i-lucide-code-2`             | script (textarea)                                                                                          |
| `set-var`             | Context   | `i-lucide-variable`           | arbitrary key → value pairs                                                                                |
| `run`                 | AI        | `i-lucide-sparkles`           | ai, task, params, input, output                                                                            |
| `sync`                | Data I/O  | `i-lucide-repeat-2`           | from.schema, from.entity, to.schema, to.entity, id                                                         |
| `anonymize`           | Transform | `i-lucide-eye-off`            | fields (array)                                                                                             |
| `remove-duplicates`   | Transform | `i-lucide-copy-x`             | key, method, strategy, condition                                                                           |
| `remove-empty-fields` | Transform | `i-lucide-eraser`             | defaults, fields                                                                                           |
| `clear`               | Transform | `i-lucide-ban`                | — (params are `null`; resets data table + clears `$vars`/`$row`/`$response`/`$result`/`$error`/`$request`) |
| `debug`               | Flow      | `i-lucide-bug`                | —                                                                                                          |
| `break`               | Flow      | `i-lucide-circle-stop`        | (optional expression)                                                                                      |

Each entry:

```ts
type StepFormField = {
  name: string                             // param key, dotted paths allowed ('from.schema')
  label: string
  type: 'text' | 'number' | 'select' | 'multi-select' | 'switch' | 'textarea' | 'map' | 'json'
  options?: { value: string, label: string }[]   // for select / multi-select
  placeholder?: string
  required?: boolean
  hint?: string
}

type StepMeta = {
  key: string
  label: string
  icon: string
  color: string                            // ui color token (primary/info/warning/success/error)
  category: 'Data I/O' | 'Transform' | 'Flow' | 'Context' | 'AI'
  defaultParams: Record<string, unknown>
  formFields: StepFormField[]
  supportsOnError?: boolean
  supportsScopeRow?: boolean               // steps like map/insert support scope: row
}
```

Every step meta automatically includes an `on-error` field when `supportsOnError` is true (see 9.4).

---

## 6. Canvas Model

### 6.1 Node/Edge conversion (`app/composables/usePlanDocument.ts`)

`usePlanDocument()` is the single source of truth for the open plan. It converts between the plan step array and Vue Flow nodes/edges:

- **steps → nodes**: each `TStep` becomes one node at `x = START_X`, `y = START_Y + index * (NODE_H + GAP)` (vertical top→bottom pipeline). Node id is `${stepKey}:${index}` — derived from index so reordering maps cleanly.
- **nodes → steps**: sort nodes by `position.y`, drop any non-step nodes, map each back to `{ [stepKey]: params }`.
- **edges**: auto-chained — consecutive real step nodes are connected by `smoothstep` edges from a step's **bottom** handle to the next step's **top** handle. Generated/regenerated whenever the order changes; never user-editable.

Constants: `NODE_W = 260`, `NODE_H = 160`, `GAP = 48`, `START_X = 40`, `START_Y = 40`.

### 6.2 State

| Ref                     | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `nodes` / `edges`       | Vue Flow models (`shallowRef`)                              |
| `plan`                  | Current `TPlan` (name, steps, failure-strategy, on-error)   |
| `dirty`                 | `true` when edits since last load/save                      |
| `selectedNodeId`        | Currently inspected node                                    |
| `saving` / `saveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'`                  |
| `schemas`               | Cached schema list (for schema/entity pickers), lazy-loaded |

---

## 7. Components

New files under `app/components/plans/`:

| Component             | Purpose                                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PlanDesigner.vue`    | 3-pane layout wrapper; owns `usePlanDocument()`; wires panels together                                                                                                                                      |
| `PlanListPanel.vue`   | Plan list (select/create/rename/delete), "Add Plan" button, Run action                                                                                                                                      |
| `StepPalette.vue`     | Grouped step types from `stepRegistry`; items `draggable="true"` with `data-step` payload                                                                                                                   |
| `PlanCanvas.vue`      | `<VueFlow>` wrapper — `<Background>`, `<Controls>`, `<Minimap>`, custom `StepNode`, drop handling, selection wiring. **Must be wrapped in `<ClientOnly>`** (canvas uses DOM APIs; not SSR-safe) |
| `StepNode.vue`        | Step card: icon + category color stripe, step label, badges (schema/entity when present), selected state, delete + up/down toolbar on hover/selection                                                       |
| `StepConfigPanel.vue` | `UTabs`: **Form** + **Advanced** (see §9)                                                                                                                                                                   |

---

## 8. Behaviors

### 8.1 Adding a step
1. **Palette drag**: user drags a palette item (`HTML5 dragstart` with step key) over the canvas; `onDragOver` prevents default; on drop, `screenToFlowCoordinate()` converts drop point → flow coords, node is inserted at that y position and the list re-sorted by y.
2. Inserted nodes get `defaultParams` from the registry; edges re-chained.

### 8.2 Reordering
- **Drag**: dragging a `StepNode` vertically moves it; on `nodeDragStop` it snaps to a slot (`index = round((y - START_Y) / (NODE_H + GAP))`), is clamped to valid range, edges re-chain, dirty = true.
- **Toolbar**: up/down buttons on the selected node call `moveStep(delta)` (swap with neighbor, keep positions consistent, re-chain edges).

### 8.3 Selection & inspection
- Click a node → `selectedNodeId` set → right panel shows `StepConfigPanel` bound to `node.data.params`.
- Esc or canvas blank-click deselects.

### 8.4 Editing params
- Form tab edits update `node.data.params` **live** (Vue reactivity) and mark dirty.
- Advanced tab holds a JSON string; on blur / explicit "Apply", `JSON.parse` validates; on success params are replaced.

### 8.5 Deleting a step
- Delete button on a node (or `Backspace` with selection) removes it; edges re-chain; dirty = true.

---

## 9. Config Inspector

### 9.1 Tabs
- **Form**: fields generated from `stepRegistry[key].formFields`.
- **Advanced**: `UTextarea` bound to `JSON.stringify(params, null, 2)` with "Format" and "Apply" buttons; inline `UAlert` on parse errors.

### 9.2 Form field rendering
| type           | control                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text`         | `UInput`                                                                                                                                                                             |
| `number`       | `UInput type="number"`                                                                                                                                                               |
| `select`       | `USelect` (options from registry; schema options from `GET /api/config/schemas`, entity options from `GET /schema/:name` rows — entity fields are hidden until a schema is selected) |
| `multi-select` | `USelect multiple`                                                                                                                                                                   |
| `switch`       | `USwitch`                                                                                                                                                                            |
| `textarea`     | `UTextarea` (used for `script`, `filter-expression`, `condition`)                                                                                                                    |
| `map`          | key/value repeater (`fields` for `sort`, `set-var` pairs, run `output`)                                                                                                              |
| `json`         | `UTextarea` with JSON validation (run `data`, `remove-empty-fields` `defaults`)                                                                                                      |

Fields are wrapped in `UFormField`/`UInput` etc. following existing studio patterns (`SourceConfigFields.vue` is the reference for provider form layout).

### 9.3 Expression hint
Fields documented as supporting `${{ }}` (JS Expression Engine) show a small `UTooltip`/hint icon (`i-lucide-braces`) — see `config.yml` `📜` markers.

### 9.4 `on-error` sub-form
When `supportsOnError`, a section renders: `scope` (`step`/`row`) and `strategy`. The strategy options are scope-dependent (step ⇒ `throw`/`skip`/`retry`; row ⇒ `skip`/`retry`/`sink`), and `scope`/`strategy` auto-correct to a supported combination (matches `on-error-yml` matrix / `U__plans_plan_on_error.ts`). Retry params live under `on-error.retry.*` (`attempts`, `delay`, `backoff`, `max-delay`, `after-retries`; `after-retries` excludes `sink` at step scope, `throw` at row scope) and only show when `strategy: retry`. Sink target under `on-error.sink.*` shows for `strategy: sink` or `retry` + row + `after-retries: sink`:
- `on-error.sink.schema` — schema **select** (options from `GET /api/config/schemas`).
- `on-error.sink.entity` — entity **select**, options populated from the selected sink schema's entities (`GET /schema/:name`); rendered only while `on-error.sink.schema` is set (same sibling lookup as the main form, but resolved under the `on-error.` prefix via `params-path`).
- `on-error.sink.include-error` — switch; `on-error.sink.error-field` — text.

On-error fields bind through `PlanFieldInput` with `params-path="on-error"`, so entity sibling lookups resolve `sink.schema` → `on-error.sink.schema`.

---

## 10. Persistence & API

### 10.1 Endpoints (proxied via existing `server/routes/server-api/[...].ts`)
| Action               | Request                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| List plans           | `GET /server-api/api/config/plans`                                              |
| Load one plan        | `GET /server-api/api/config/plans/:name`                                        |
| Create/update        | `PUT /server-api/api/config/plans/:name` (body = `TPlan` object, `steps` array) |
| Delete               | `DELETE /server-api/api/config/plans/:name`                                     |
| Reload server config | `POST /server-api/api/config/reload`                                            |

### 10.2 Save flow
1. Convert nodes → steps (`steps` array), include plan-level `on-error` / `failure-strategy`.
2. `PUT /server-api/api/config/plans/:name`.
3. `POST /server-api/api/config/reload`.
4. `dirty = false`, toast "Plan saved" (`UToast`); on failure show `UAlert` with error and keep `dirty = true`.

### 10.3 Load flow
On plan select: `GET /server-api/api/config/plans/:name` → hydrate `usePlanDocument` (steps → nodes/edges). Unsaved changes trigger a confirm prompt before switching.

### 10.4 Reload on external change
Refetch the plan list when the page regains focus (optional, `useEventListener('focus')`) so external edits (config.yml hot-reload) are visible.

---

## 11. Validation

| Case                                   | Behavior                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Empty plan (0 steps)                   | Allowed to render; blocked from saving with an inline error (server requires ≥ 1 step) |
| Invalid JSON in Advanced tab           | Inline `UAlert`; Apply blocked                                                         |
| Duplicate/missing required form fields | Inline field error via `UFormField`; Save blocked                                      |
| Unknown `stepKey` in loaded plan       | Rendered as fallback "Unknown step" node (kept on save so nothing is silently dropped) |
| Save failure (401/500/validation)      | Error `UAlert` + toast, dirty preserved                                                |

---

## 12. Implementation Notes

- **SSR**: all Vue Flow components render client-side only — wrap `PlanCanvas` (and its graph imports) in `<ClientOnly>`.
- **Id stability**: node ids derive from `stepKey:index`; regenerate after reorder/delete to avoid stale handles.
- **Reactivity**: keep `nodes`/`edges` as `shallowRef` and update `node.data.params` by reference for performant canvas updates (Vue Flow tracks reactively, per `@vue-flow/core` docs).
- **DnD**: palette uses the native HTML5 drag API + `screenToFlowCoordinate` (per Vue Flow drag-and-drop guide) — no extra DnD library needed. Vue Flow's node dragging handles canvas reordering.
- **Nuxt auto-imports**: components under `app/components/plans/` are auto-registered (`<PlanDesigner />` etc.); the page itself uses `<PlanDesigner />` with no manual imports.
- **Type safety**: `types/plans.ts` types mirror the server zod schemas in `apps/server/src/modules/plan/types/` (`U__plans_plan__step`, `U__plans_plan`). Keep `TStep` loose (`Record<string, unknown>`) because params vary per step type.

---

## 13. Page Changes

- `app/pages/designer/index.vue` — replace the static mockup body with `<PlanDesigner />`; keep the page-level header if desired.

---

## 14. Test Cases

Manual/visual + Vitest where feasible (studio has `nuxt typecheck`; component unit tests follow the repo Vitest setup if added).

### 14.1 Palette & adding
| #   | Test                                         | Expected                                                            |
| --- | -------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Drag `select` from palette onto empty canvas | One `select` node appears with defaults                                    |
| 2   | Drop between two nodes                       | Node inserted at drop y-position, order re-sorted, edges re-chained |
| 3   | Palette items grouped by category            | Groups: Data I/O/Transform/Flow/Context/AI                          |

### 14.2 Reordering
| #   | Test                       | Expected                                                |
| --- | -------------------------- | ------------------------------------------------------- |
| 5   | Drag node to a new slot    | Snaps to slot, edges re-chain, order correct in `steps` |
| 6   | Up/down toolbar buttons    | Swap with neighbor, order correct                       |
| 7   | Reorder then save → reload | Persisted order matches                                 |

### 14.3 Config editing
| #   | Test                              | Expected                                                   |
| --- | --------------------------------- | ---------------------------------------------------------- |
| 8   | Edit a form field (e.g. `entity`) | `node.data.params` updates live, badge on node reflects it |
| 9   | Advanced tab: valid JSON + Apply  | Params replaced, dirty set                                 |
| 10  | Advanced tab: invalid JSON        | Inline error, params unchanged                             |
| 11  | `${{ }}` value in a field         | Preserved verbatim in JSON and on save                     |

### 14.4 Persistence
| #   | Test                             | Expected                                     |
| --- | -------------------------------- | -------------------------------------------- |
| 12  | Save → reload server config      | Plan reflects edits; other plans unchanged   |
| 13  | Switch plan with unsaved changes | Confirm prompt; abort keeps edits            |
| 14  | Save failure                     | Error state, dirty preserved                 |
| 15  | Load plan with unknown step key  | Rendered as fallback node, preserved on save |

### 14.5 Canvas UX
| #   | Test                                      | Expected                                                   |
| --- | ----------------------------------------- | ---------------------------------------------------------- |
| 16  | Pan / zoom / minimap / fit-controls       | Work as expected; minimap visible                          |
| 17  | Blank-click deselects; Esc deselects      | Inspector returns to placeholder                           |
| 18  | Delete selected node (button + Backspace) | Removed, edges re-chained                                  |
| 19  | Dark/light mode                           | Step cards and canvas colors adapt                         |
| 20  | Empty plan                                | Canvas is empty; save blocked with inline error            |

---

## 15. Verification

```sh
yarn workspace @metal/studio dev:lint       # eslint
yarn workspace @metal/studio dev:typecheck  # nuxt typecheck
yarn workspace @metal/studio dev            # manual visual verification at /designer
```

---

## 16. Open Questions / Follow-ups
- Schema/entity pickers: `GET /api/config/schemas` returns the config `schemas` section (names/sources only, **no entities**); per-schema entities are resolved lazily via `GET /schema/:name` (authenticated, LIST permission) and cached in `doc.schemas`. Entity fields hide when no schema is selected.
- "Run" from the designer: decide whether to link to existing plan execution endpoint (`POST /api/plan/:plan/run` if exposed) — out of scope for v1.
- Plan-level `failure-strategy` / `on-error`: expose as fields in the inspector header area (v1.1).
