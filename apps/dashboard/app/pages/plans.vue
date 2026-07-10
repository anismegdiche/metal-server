<script setup lang="ts">
const planMetrics = ref({
  planName: 'myplan',
  status: 'running',
  steps: [
    {
      planName: 'myplan',
      index: 0,
      step: {
        startTime: '2026-07-07T19:02:20.678Z',
        endTime: '2026-07-07T19:02:21.038Z',
        status: 'success',
        durationMs: 360
      },
      attemptCount: 1,
      rows: { input: 0, passed: 2 }
    },
    {
      planName: 'myplan',
      index: 1,
      step: {
        startTime: '2026-07-07T19:02:21.040Z',
        endTime: '2026-07-07T19:02:21.342Z',
        status: 'success',
        durationMs: 302
      },
      attemptCount: 1,
      rows: { input: 2, passed: 2 }
    },
    {
      planName: 'myplan',
      index: 2,
      step: {
        startTime: '2026-07-07T19:02:21.344Z'
      },
      attemptCount: 1,
      rows: { input: 2 }
    }
  ],
  startTime: '2026-07-07T19:02:20.672Z'
})

const allPlans = ref([
  {
    name: 'myplan',
    status: 'running',
    lastRun: '2026-07-07T19:02:20Z',
    nextRun: null,
    duration: 672,
    stepsCount: 3
  },
  {
    name: 'nightly-sync',
    status: 'completed',
    lastRun: '2026-07-07T18:00:00Z',
    nextRun: '2026-07-08T18:00:00Z',
    duration: 84520,
    stepsCount: 8
  },
  {
    name: 'user-import',
    status: 'completed',
    lastRun: '2026-07-07T12:30:00Z',
    nextRun: '2026-07-08T00:00:00Z',
    duration: 32100,
    stepsCount: 5
  },
  {
    name: 'data-cleanup',
    status: 'failed',
    lastRun: '2026-07-07T10:00:00Z',
    nextRun: '2026-07-07T10:00:00Z',
    duration: 12000,
    stepsCount: 4
  },
  {
    name: 'report-gen',
    status: 'completed',
    lastRun: '2026-07-06T23:59:00Z',
    nextRun: '2026-07-07T23:59:00Z',
    duration: 245000,
    stepsCount: 12
  }
])

const selectedPlan = ref(planMetrics.value.planName)

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString()
}

const planColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'stepsCount', header: 'Steps' },
  { accessorKey: 'duration', header: 'Duration' },
  { accessorKey: 'lastRun', header: 'Last Run' },
  { accessorKey: 'nextRun', header: 'Next Run' }
]

const stepColumns = [
  { accessorKey: 'index', header: '#' },
  { id: 'status', accessorKey: 'step.status', header: 'Status' },
  { id: 'startTime', accessorKey: 'step.startTime', header: 'Start' },
  { id: 'endTime', accessorKey: 'step.endTime', header: 'End' },
  { id: 'durationMs', accessorKey: 'step.durationMs', header: 'Duration' },
  { accessorKey: 'attemptCount', header: 'Attempts' },
  { id: 'rows', header: 'Rows In/Out' }
]

function statusColor(status: string) {
  if (status === 'completed' || status === 'success') return 'success' as const
  if (status === 'running') return 'info' as const
  if (status === 'failed') return 'error' as const
  return 'neutral' as const
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-workflow ml-0 mr-2" />Plans</h1>
      <p class="text-sm text-muted">Monitor and manage ETL pipeline executions</p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">All Plans</h2>
        </div>
      </template>
      <UTable
        :columns="planColumns"
        :rows="allPlans"
      >
        <template #status-cell="{ row }">
          <UBadge :color="statusColor(row.status)" variant="subtle" size="sm">
            {{ row.status }}
          </UBadge>
        </template>
        <template #duration-cell="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
        <template #lastRun-cell="{ row }">
          <span class="text-sm">{{ new Date(row.lastRun).toLocaleString() }}</span>
        </template>
        <template #nextRun-cell="{ row }">
          <span class="text-sm">{{ row.nextRun ? new Date(row.nextRun).toLocaleString() : '—' }}</span>
        </template>
        <template #name-cell="{ row }">
          <UButton
            variant="link"
            color="primary"
            @click="selectedPlan = row.name"
          >
            {{ row.name }}
          </UButton>
        </template>
      </UTable>
    </UCard>

    <UCard v-if="planMetrics">
      <template #header>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="font-semibold">{{ planMetrics.planName }}</h2>
              <UBadge :color="statusColor(planMetrics.status)" variant="subtle">
                {{ planMetrics.status }}
              </UBadge>
            </div>
            <span class="text-sm text-muted">
              Started {{ new Date(planMetrics.startTime).toLocaleString() }}
            </span>
          </div>
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <div v-for="step in planMetrics.steps" :key="step.index" class="flex items-start gap-4 p-3 rounded-lg bg-elevated/50">
          <div class="flex flex-col items-center gap-1">
            <div
              class="size-3 rounded-full"
              :class="step.step.status === 'success' ? 'bg-success' : step.step.status === 'running' ? 'bg-info animate-pulse' : 'bg-muted'"
            />
            <div v-if="step.index < planMetrics.steps.length - 1" class="w-px h-full min-h-8 bg-default" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">Step {{ step.index + 1 }}</span>
              <span class="text-xs text-muted">
                <template v-if="step.step.durationMs">
                  {{ formatDuration(step.step.durationMs) }}
                </template>
                <template v-else>in progress...</template>
              </span>
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-muted">
              <span>Start: {{ formatTime(step.step.startTime) }}</span>
              <span v-if="step.step.endTime">End: {{ formatTime(step.step.endTime) }}</span>
              <span v-if="step.step.status">Status:
                <UBadge :color="statusColor(step.step.status)" variant="subtle" size="xs">
                  {{ step.step.status }}
                </UBadge>
              </span>
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-muted">
              <span>Attempt #{{ step.attemptCount }}</span>
              <span v-if="step.rows.input !== undefined">Rows in: {{ step.rows.input }}</span>
              <span v-if="step.rows.passed !== undefined">Rows out: {{ step.rows.passed }}</span>
            </div>
          </div>
        </div>

        <USeparator />

        <div class="overflow-auto">
          <UTable :columns="stepColumns" :rows="planMetrics.steps">
            <template #status-cell="{ row }">
              <UBadge :color="statusColor(row.step.status)" variant="subtle" size="xs">
                {{ row.step.status || 'pending' }}
              </UBadge>
            </template>
            <template #startTime-cell="{ row }">
              {{ formatTime(row.step.startTime) }}
            </template>
            <template #endTime-cell="{ row }">
              {{ row.step.endTime ? formatTime(row.step.endTime) : '—' }}
            </template>
            <template #durationMs-cell="{ row }">
              {{ row.step.durationMs ? formatDuration(row.step.durationMs) : '—' }}
            </template>
            <template #rows-cell="{ row }">
              <span v-if="row.rows.input !== undefined">
                {{ row.rows.input }} / {{ row.rows.passed ?? '—' }}
              </span>
              <span v-else>—</span>
            </template>
          </UTable>
        </div>
      </div>
    </UCard>
  </div>
</template>
