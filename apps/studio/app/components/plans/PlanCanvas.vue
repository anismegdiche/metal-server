<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { GAP, NODE_H, START_Y, usePlanDocumentInjected } from '~/composables/usePlanDocument'
import StepNode from './StepNode.vue'

const doc = usePlanDocumentInjected()
const { screenToFlowCoordinate } = useVueFlow('plan-designer-flow')

const dragOver = ref(false)
let dragCount = 0

function onNodeClick({ node }: NodeMouseEvent) {
  doc.setSelected(node.id)
}
function onPaneClick() {
  doc.setSelected(null)
}
function onNodeDragStop({ node }: NodeDragEvent) {
  doc.snapNode(node.id, node.position.y)
}
function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  dragCount += 1
  dragOver.value = true
}
function onDragLeave() {
  dragCount = Math.max(0, dragCount - 1)
  if (dragCount === 0) dragOver.value = false
}
function onDrop(event: DragEvent) {
  event.preventDefault()
  dragCount = 0
  dragOver.value = false
  const stepKey = event.dataTransfer?.getData('application/metal-step')
  if (!stepKey) return
  const { y } = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const index = Math.min(Math.max(Math.round((y - START_Y) / (NODE_H + GAP)), 0), doc.entries.length)
  doc.addStep(stepKey, index)
}
</script>

<template>
  <div
    class="relative h-full w-full"
    :class="[dragOver ? 'ring-2 ring-inset ring-primary-500/50' : '']"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <ClientOnly>
      <VueFlow
        id="plan-designer-flow"
        :nodes="doc.flowNodes"
        :edges="doc.flowEdges"
        :nodes-draggable="true"
        :nodes-connectable="false"
        :nodes-focusable="true"
        :elements-selectable="true"
        :pan-on-drag="true"
        :pan-on-scroll="false"
        :zoom-on-scroll="true"
        :zoom-on-pinch="true"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
        class="h-full w-full"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
        @node-drag-stop="onNodeDragStop"
      >
        <template #node-step="nodeProps">
          <StepNode v-bind="nodeProps" />
        </template>
        <Background
          :gap="28"
          :size="1.5"
        />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          :node-color="'#8b5cf6'"
          :node-stroke-color="'#6d28d9'"
          :mask-color="'rgba(148, 163, 184, 0.15)'"
          pannable
          zoomable
        />
      </VueFlow>
      <template #fallback>
        <div class="flex h-full w-full items-center justify-center text-sm text-gray-400">
          Loading editor…
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style>
.vue-flow__controls {
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
}
.vue-flow__minimap {
  border-radius: 0.75rem;
  overflow: hidden;
}
</style>
