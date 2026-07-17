<script setup lang="ts">
const plans = ref([
  { id: '1', name: 'Import Users', status: 'active', steps: 5, lastRun: '2h ago', duration: '1.2s' },
  { id: '2', name: 'Sync Inventory', status: 'active', steps: 3, lastRun: '30m ago', duration: '4.5s' },
  { id: '3', name: 'Daily Report', status: 'inactive', steps: 8, lastRun: '1d ago', duration: '12s' },
  { id: '4', name: 'Clean Logs', status: 'active', steps: 2, lastRun: '6h ago', duration: '0.8s' },
])

const selectedPlan = ref(plans.value[0])

const nodes = ref([
  { id: '1', type: 'input', position: { x: 50, y: 50 }, data: { label: 'Source: PostgreSQL' } },
  { id: '2', type: 'default', position: { x: 300, y: 50 }, data: { label: 'Transform: Filter' } },
  { id: '3', type: 'default', position: { x: 550, y: 50 }, data: { label: 'Transform: Map' } },
  { id: '4', type: 'output', position: { x: 800, y: 50 }, data: { label: 'Target: MySQL' } },
])

function selectPlan(plan: typeof plans.value[0]) {
  selectedPlan.value = plan
}
</script>

<template>
  <div class="flex h-full">
    <div class="w-1/5 border-r border-default flex flex-col shrink-0">
      <div class="p-3 border-b border-default">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">Plans</h2>
          <UButton icon="i-lucide-plus" size="xs" variant="ghost" />
        </div>
      </div>
      <div class="flex-1 overflow-auto">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="p-3 border-b border-default cursor-pointer hover:bg-elevated/50 transition-colors"
          :class="{ 'bg-elevated/50': selectedPlan?.id === plan.id }"
          @click="selectPlan(plan)"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ plan.name }}</span>
            <UBadge
              :color="plan.status === 'active' ? 'success' : 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ plan.status }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2 mt-1 text-xs text-muted">
            <span>{{ plan.steps }} steps</span>
            <span>&middot;</span>
            <span>{{ plan.lastRun }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col min-w-0">
      <div class="p-3 border-b border-default flex items-center justify-between">
        <div>
          <h2 class="font-semibold">{{ selectedPlan?.name }}</h2>
          <p class="text-xs text-muted">{{ selectedPlan?.steps }} steps &middot; Last run {{ selectedPlan?.lastRun }}</p>
        </div>
        <div class="flex gap-2">
          <UButton icon="i-lucide-play" label="Run" size="xs" variant="outline" />
          <UButton icon="i-lucide-settings" size="xs" variant="ghost" />
        </div>
      </div>

      <div class="flex-1 bg-muted/20 p-4">
        <div class="flex items-center justify-center h-full">
          <div class="flex items-center gap-4">
            <div
              v-for="(node, index) in nodes"
              :key="node.id"
              class="flex items-center"
            >
              <UCard class="w-40">
                <div class="text-center">
                  <UIcon
                    :name="node.type === 'input' ? 'i-lucide-arrow-left' : node.type === 'output' ? 'i-lucide-arrow-right' : 'i-lucide-shuffle'"
                    class="size-5 mx-auto mb-1"
                    :class="node.type === 'input' ? 'text-success' : node.type === 'output' ? 'text-info' : 'text-warning'"
                  />
                  <p class="text-xs font-medium">{{ node.data.label }}</p>
                </div>
              </UCard>
              <UIcon
                v-if="index < nodes.length - 1"
                name="i-lucide-arrow-right"
                class="size-4 text-muted mx-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
