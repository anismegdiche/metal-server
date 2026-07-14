<script setup lang="ts">
type ResolvedEntity = { name: string, type: string, anonymize?: string[], fromDefaultSource: boolean }
type ResolvedSource = { name: string, provider: string, host: string, port: number, entities: ResolvedEntity[] }
type ResolvedSchema = { name: string, type: 'source-only' | 'entities-only' | 'merged', sources: ResolvedSource[], defaultSource?: string }

const props = defineProps<{ schema: ResolvedSchema }>()

const containerRef = ref<HTMLElement | null>(null)
const schemaNodeRef = ref<HTMLElement | null>(null)
const sourceNodeRefs = ref<HTMLElement[]>([])
const entityGroupRefs = ref<HTMLElement[]>([])

const providerIcon: Record<string, string> = { mssql: 'i-lucide-server', postgresql: 'i-lucide-database', mongodb: 'i-lucide-leaf' }
const typeIcon: Record<string, string> = { table: 'i-lucide-table', view: 'i-lucide-eye', collection: 'i-lucide-box' }

type NodeRect = { x: number, y: number, w: number, h: number, cx: number, cy: number }

const sourceRects = ref<NodeRect[]>([])
const entityGroupRects = ref<NodeRect[]>([])

function measure() {
  if (!containerRef.value) return
  const container = containerRef.value.getBoundingClientRect()

  sourceRects.value = sourceNodeRefs.value.map(el => {
    const r = el.getBoundingClientRect()
    return { x: r.left - container.left, y: r.top - container.top, w: r.width, h: r.height, cx: r.left - container.left + r.width / 2, cy: r.top - container.top + r.height / 2 }
  })

  entityGroupRects.value = entityGroupRefs.value.map(el => {
    const r = el.getBoundingClientRect()
    return { x: r.left - container.left, y: r.top - container.top, w: r.width, h: r.height, cx: r.left - container.left + r.width / 2, cy: r.top - container.top + r.height / 2 }
  })
}

const schemaRect = computed<NodeRect>(() => {
  if (!containerRef.value) return { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 }
  const cw = containerRef.value.clientWidth
  return { x: cw / 2 - 80, y: 16, w: 160, h: 48, cx: cw / 2, cy: 40 }
})

type Link = { x1: number, y1: number, x2: number, y2: number }

const links = computed<Link[]>(() => {
  const result: Link[] = []
  const sr = schemaRect.value

  sourceRects.value.forEach(src => {
    result.push({ x1: sr.cx, y1: sr.cy + sr.h / 2, x2: src.cx, y2: src.cy - src.h / 2 })
  })

  entityGroupRects.value.forEach((eg, i) => {
    if (sourceRects.value[i]) {
      const src = sourceRects.value[i]
      result.push({ x1: src.cx, y1: src.cy + src.h / 2, x2: eg.cx, y2: eg.cy - eg.h / 2 })
    }
  })

  return result
})

function bezierPath(l: Link): string {
  const midY = (l.y1 + l.y2) / 2
  return `M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`
}

function isDefaultSource(source: ResolvedSource): boolean {
  return props.schema.type === 'merged' && source.name === props.schema.defaultSource
}

onMounted(() => {
  nextTick(measure)
})

watch(() => props.schema, () => {
  nextTick(measure)
})
</script>

<template>
  <div ref="containerRef" class="relative min-h-[500px] w-full">
    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0">
      <defs>
        <marker id="org-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0 0, 10 3.5, 0 7" class="fill-muted" />
        </marker>
      </defs>
      <path
        v-for="(link, i) in links"
        :key="i"
        :d="bezierPath(link)"
        fill="none"
        class="stroke-muted"
        stroke-width="1.5"
        stroke-dasharray="4 2"
        marker-end="url(#org-arrow)"
      />
    </svg>

    <div class="relative flex flex-col items-center gap-0" style="z-index: 1">
      <div
        ref="schemaNodeRef"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-primary/10 border-primary/30 text-primary font-semibold text-sm"
      >
        <UIcon name="i-lucide-layers" class="size-4" />
        {{ schema.name }}
        <UBadge v-if="schema.type === 'merged'" color="primary" variant="subtle" size="xs">merged</UBadge>
      </div>

      <div class="w-px h-8 bg-muted/50" />

      <div class="flex gap-6 items-start">
        <div v-for="(source, si) in schema.sources" :key="source.name" class="flex flex-col items-center">
          <div
            :ref="el => { if (el) sourceNodeRefs[si] = el as HTMLElement }"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium"
            :class="isDefaultSource(source)
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-info/10 border-info/30 text-info'"
          >
            <UIcon :name="providerIcon[source.provider] ?? 'i-lucide-plug'" class="size-4" />
            {{ source.name }}
            <UBadge v-if="isDefaultSource(source)" color="primary" variant="subtle" size="xs">default</UBadge>
          </div>

          <div class="w-px h-6 bg-muted/50" />

          <div
            :ref="el => { if (el) entityGroupRefs[si] = el as HTMLElement }"
            class="flex flex-wrap justify-center gap-1.5 max-w-[240px]"
          >
            <div
              v-for="entity in source.entities"
              :key="entity.name"
              class="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
              :class="[
                entity.type === 'table' ? 'bg-info/5 border-info/20 text-info' :
                entity.type === 'view' ? 'bg-success/5 border-success/20 text-success' :
                'bg-warning/5 border-warning/20 text-warning',
                schema.type === 'merged' && !entity.fromDefaultSource ? 'border-dashed ring-1 ring-warning/30' : ''
              ]"
            >
              <UIcon :name="typeIcon[entity.type] ?? 'i-lucide-circle'" class="size-3" />
              {{ entity.name }}
              <UIcon v-if="entity.anonymize" name="i-lucide-eye-off" class="size-3 text-warning" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
