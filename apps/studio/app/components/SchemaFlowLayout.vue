<script setup lang="ts">
import { getProviderIcon, getTypeIcon } from '~/utils/constants'
import type { ResolvedSchema } from '~/types/schema-charts'
import { isDefaultSource } from '~/types/schema-charts'

const props = defineProps<{ schema: ResolvedSchema }>()

const containerRef = ref<HTMLElement | null>(null)
const schemaNodeRef = ref<HTMLElement | null>(null)
const sourceNodeRefs = ref<HTMLElement[]>([])
const entityNodeRefs = ref<HTMLElement[]>([])

type NodeRect = { x: number, y: number, w: number, h: number, cx: number, cy: number }

const schemaRect = ref<NodeRect>({ x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 })
const sourceRects = ref<NodeRect[]>([])
const entityRects = ref<NodeRect[]>([])

function measure() {
  if (!containerRef.value) return
  const container = containerRef.value.getBoundingClientRect()

  if (schemaNodeRef.value) {
    const r = schemaNodeRef.value.getBoundingClientRect()
    schemaRect.value = { x: r.left - container.left, y: r.top - container.top, w: r.width, h: r.height, cx: r.left - container.left + r.width / 2, cy: r.top - container.top + r.height / 2 }
  }

  sourceRects.value = sourceNodeRefs.value.map(el => {
    const r = el.getBoundingClientRect()
    return { x: r.left - container.left, y: r.top - container.top, w: r.width, h: r.height, cx: r.left - container.left + r.width / 2, cy: r.top - container.top + r.height / 2 }
  })

  entityRects.value = entityNodeRefs.value.map(el => {
    const r = el.getBoundingClientRect()
    return { x: r.left - container.left, y: r.top - container.top, w: r.width, h: r.height, cx: r.left - container.left + r.width / 2, cy: r.top - container.top + r.height / 2 }
  })
}

const flatEntityIndex = computed(() => {
  const index: { sourceIdx: number, entityIdx: number }[] = []
  props.schema.sources.forEach((source, si) => {
    source.entities.forEach((_, ei) => {
      index.push({ sourceIdx: si, entityIdx: ei })
    })
  })
  return index
})

type Link = { x1: number, y1: number, x2: number, y2: number }

const links = computed<Link[]>(() => {
  const result: Link[] = []

  sourceRects.value.forEach(src => {
    result.push({ x1: schemaRect.value.cx + schemaRect.value.w / 2, y1: schemaRect.value.cy, x2: src.cx - src.w / 2, y2: src.cy })
  })

  flatEntityIndex.value.forEach((idx, ei) => {
    const src = sourceRects.value[idx.sourceIdx]
    const ent = entityRects.value[ei]
    if (src && ent) {
      result.push({ x1: src.cx + src.w / 2, y1: src.cy, x2: ent.cx - ent.w / 2, y2: ent.cy })
    }
  })

  return result
})

function bezierPath(l: Link): string {
  const dx = Math.abs(l.x2 - l.x1)
  const cp = dx * 0.4
  return `M ${l.x1} ${l.y1} C ${l.x1 + cp} ${l.y1}, ${l.x2 - cp} ${l.y2}, ${l.x2} ${l.y2}`
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
        <marker id="flow-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
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
        marker-end="url(#flow-arrow)"
      />
    </svg>

    <div class="flex items-start gap-12 relative" style="z-index: 1">
      <div class="flex-shrink-0 pt-2">
        <div
          ref="schemaNodeRef"
          class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 bg-primary/15 border-primary/40 text-primary font-bold text-sm shadow-lg shadow-primary/5"
        >
          <UIcon name="i-lucide-layers" class="size-5" />
          {{ schema.name }}
          <UBadge v-if="schema.type === 'merged'" color="primary" variant="subtle" size="xs">merged</UBadge>
        </div>
      </div>

      <div class="flex flex-col gap-4 flex-shrink-0">
        <div
          v-for="(source, si) in schema.sources"
          :key="source.name"
          class="flex flex-col items-start"
        >
          <div
            :ref="el => { if (el) sourceNodeRefs[si] = el as HTMLElement }"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium shadow-md whitespace-nowrap"
            :class="isDefaultSource(schema, source.name)
              ? 'bg-primary/10 border-primary/30 text-primary shadow-primary/5'
              : 'bg-info/10 border-info/30 text-info shadow-info/5'"
          >
            <UIcon :name="getProviderIcon(source.provider)" class="size-4" />
            {{ source.name }}
            <UBadge v-if="isDefaultSource(schema, source.name)" color="primary" variant="subtle" size="xs">default</UBadge>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 flex-shrink-0 pt-1">
        <template v-for="(source, si) in schema.sources" :key="source.name">
          <div class="flex flex-col gap-1">
            <div
              v-for="(entity, ei) in source.entities"
              :key="entity.name"
              :ref="el => {
                const flatIdx = flatEntityIndex.findIndex(f => f.sourceIdx === si && f.entityIdx === ei)
                if (el && flatIdx >= 0) entityNodeRefs[flatIdx] = el as HTMLElement
              }"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs shadow-sm whitespace-nowrap"
              :class="[
                entity.type === 'table' ? 'bg-info/5 border-info/20 text-info' :
                entity.type === 'view' ? 'bg-success/5 border-success/20 text-success' :
                'bg-warning/5 border-warning/20 text-warning',
                schema.type === 'merged' && !entity.fromDefaultSource ? 'border-dashed ring-1 ring-warning/30' : ''
              ]"
            >
              <UIcon :name="getTypeIcon(entity.type)" class="size-3" />
              {{ entity.name }}
              <UIcon v-if="entity.anonymize" name="i-lucide-eye-off" class="size-3 text-warning" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
