<script setup lang="ts">
type ResolvedEntity = { name: string, type: string, anonymize?: string[], fromDefaultSource: boolean }
type ResolvedSource = { name: string, provider: string, host: string, port: number, entities: ResolvedEntity[] }
type ResolvedSchema = { name: string, type: 'source-only' | 'entities-only' | 'merged', sources: ResolvedSource[], defaultSource?: string }

const props = defineProps<{ schema: ResolvedSchema }>()

const containerRef = ref<HTMLElement | null>(null)
const containerSize = ref({ w: 0, h: 0 })

const providerIcon: Record<string, string> = { mssql: 'i-lucide-server', postgresql: 'i-lucide-database', mongodb: 'i-lucide-leaf' }
const typeIcon: Record<string, string> = { table: 'i-lucide-table', view: 'i-lucide-eye', collection: 'i-lucide-box' }

type Pos = { x: number, y: number }

const sourceRadius = 160
const entityRadius = 80

const sourcePositions = computed<Pos[]>(() => {
  const cx = containerSize.value.w / 2
  const cy = containerSize.value.h / 2
  const n = props.schema.sources.length
  return props.schema.sources.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return { x: cx + sourceRadius * Math.cos(angle), y: cy + sourceRadius * Math.sin(angle) }
  })
})

type PositionedEntity = ResolvedEntity & { pos: Pos, sourceName: string }

const positionedEntities = computed<PositionedEntity[]>(() => {
  const result: PositionedEntity[] = []
  props.schema.sources.forEach((source, si) => {
    const sp = sourcePositions.value[si]
    if (!sp) return
    const n = source.entities.length
    const angle0 = Math.atan2(sp.y - containerSize.value.h / 2, sp.x - containerSize.value.w / 2)
    source.entities.forEach((entity, ei) => {
      const spread = Math.PI * 0.8
      const angle = angle0 - spread / 2 + (n > 1 ? (spread * ei) / (n - 1) : 0)
      result.push({ ...entity, sourceName: source.name, pos: { x: sp.x + entityRadius * Math.cos(angle), y: sp.y + entityRadius * Math.sin(angle) } })
    })
  })
  return result
})

type Link = { x1: number, y1: number, x2: number, y2: number }

const links = computed<Link[]>(() => {
  const result: Link[] = []
  const cx = containerSize.value.w / 2
  const cy = containerSize.value.h / 2

  sourcePositions.value.forEach(sp => {
    result.push({ x1: cx, y1: cy, x2: sp.x, y2: sp.y })
  })

  positionedEntities.value.forEach(pe => {
    const sp = sourcePositions.value.find((_, si) => props.schema.sources[si]?.name === pe.sourceName)
    if (sp) {
      result.push({ x1: sp.x, y1: sp.y, x2: pe.pos.x, y2: pe.pos.y })
    }
  })

  return result
})

function bezierPath(l: Link): string {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return ''
  const curvature = dist * 0.3
  const nx = -dy / dist
  const ny = dx / dist
  const mx = (l.x1 + l.x2) / 2 + nx * curvature * 0.2
  const my = (l.y1 + l.y2) / 2 + ny * curvature * 0.2
  return `M ${l.x1} ${l.y1} Q ${mx} ${my}, ${l.x2} ${l.y2}`
}

function isDefaultSource(sourceName: string): boolean {
  return props.schema.type === 'merged' && sourceName === props.schema.defaultSource
}

onMounted(() => {
  if (!containerRef.value) return
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      containerSize.value = { w: entry.contentRect.width, h: entry.contentRect.height }
    }
  })
  ro.observe(containerRef.value)
  containerSize.value = { w: containerRef.value.clientWidth, h: containerRef.value.clientHeight }
})
</script>

<template>
  <div ref="containerRef" class="relative w-full h-[500px]">
    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0">
      <defs>
        <marker id="radial-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="5" orient="auto-start-reverse">
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
        marker-end="url(#radial-arrow)"
      />
    </svg>

    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <div class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 bg-primary/15 border-primary/40 text-primary font-bold text-base shadow-lg shadow-primary/5">
        <UIcon name="i-lucide-layers" class="size-5" />
        {{ schema.name }}
        <UBadge v-if="schema.type === 'merged'" color="primary" variant="subtle" size="xs">merged</UBadge>
      </div>
    </div>

    <template v-for="(source, si) in schema.sources" :key="source.name">
      <div
        v-if="sourcePositions[si]"
        class="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        :style="{ left: sourcePositions[si].x + 'px', top: sourcePositions[si].y + 'px' }"
      >
        <div
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium shadow-md whitespace-nowrap"
          :class="isDefaultSource(source.name)
            ? 'bg-primary/10 border-primary/30 text-primary shadow-primary/5'
            : 'bg-info/10 border-info/30 text-info shadow-info/5'"
        >
          <UIcon :name="providerIcon[source.provider] ?? 'i-lucide-plug'" class="size-4" />
          {{ source.name }}
          <UBadge v-if="isDefaultSource(source.name)" color="primary" variant="subtle" size="xs">default</UBadge>
        </div>
      </div>
    </template>

    <div
      v-for="pe in positionedEntities"
      :key="pe.name"
      class="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      :style="{ left: pe.pos.x + 'px', top: pe.pos.y + 'px' }"
    >
      <div
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs shadow-sm whitespace-nowrap"
        :class="[
          pe.type === 'table' ? 'bg-info/5 border-info/20 text-info' :
          pe.type === 'view' ? 'bg-success/5 border-success/20 text-success' :
          'bg-warning/5 border-warning/20 text-warning',
          schema.type === 'merged' && !pe.fromDefaultSource ? 'border-dashed ring-1 ring-warning/30' : ''
        ]"
      >
        <UIcon :name="typeIcon[pe.type] ?? 'i-lucide-circle'" class="size-3" />
        {{ pe.name }}
      </div>
    </div>
  </div>
</template>
