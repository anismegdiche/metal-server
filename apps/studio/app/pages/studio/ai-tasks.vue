<script setup lang="ts">

const aiTasks = ref([
  { id: 'ocr-001', engine: 'OCR', input: 'invoice-2026-07-07.pdf', status: 'running', progress: 65, started: '2026-07-07T19:00:00Z', duration: '1m 12s' },
  { id: 'txt-002', engine: 'Text', input: 'customer-complaint-42.txt', status: 'completed', progress: 100, started: '2026-07-07T18:55:00Z', duration: '34s' },
  { id: 'img-003', engine: 'Image', input: 'product-photo-1283.jpg', status: 'queued', progress: 0, started: null, duration: null },
  { id: 'aud-004', engine: 'Audio', input: 'call-recording-20260707.wav', status: 'completed', progress: 100, started: '2026-07-07T18:30:00Z', duration: '5m 20s' },
  { id: 'ocr-005', engine: 'OCR', input: 'contract-scan-99.pdf', status: 'failed', progress: 42, started: '2026-07-07T17:00:00Z', duration: '28s' },
  { id: 'txt-006', engine: 'Text', input: 'legal-doc-v3.txt', status: 'queued', progress: 0, started: null, duration: null },
  { id: 'doc-007', engine: 'Document', input: 'annual-report-2026.docx', status: 'running', progress: 78, started: '2026-07-07T18:45:00Z', duration: '2m 45s' }
])

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'engine', header: 'Engine' },
  { accessorKey: 'input', header: 'Input' },
  { accessorKey: 'progress', header: 'Progress' },
  { id: 'started', header: 'Started' },
  { accessorKey: 'duration', header: 'Duration' },
  { accessorKey: 'status', header: 'Status' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-bot" class="ml-0 mr-2" />AI Tasks</h1>
      <p class="text-sm text-muted">Docker-based AI engine task execution</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard v-for="engine in ['OCR', 'Text', 'Image', 'Audio']" :key="engine">
        <template #header>
          <span class="text-sm text-muted">{{ engine }}</span>
        </template>
        <p class="text-2xl font-bold">
          {{ aiTasks.filter(t => t.engine === engine).length }}
        </p>
        <p class="text-xs text-muted mt-1">
          {{ aiTasks.filter(t => t.engine === engine && t.status === 'running').length }} running
        </p>
      </UCard>
    </div>

    <UCard>
      <UTable :columns="columns" :data="aiTasks">
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'completed' ? 'success' : row.original.status === 'running' ? 'info' : row.original.status === 'failed' ? 'error' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #progress-cell="{ row }">
          <div class="flex items-center gap-2">
            <UProgress
              :value="row.original.progress"
              :color="row.original.status === 'failed' ? 'error' : row.original.status === 'completed' ? 'success' : 'primary'"
              class="flex-1"
            />
            <span class="text-xs text-muted w-8 text-right">{{ row.original.progress }}%</span>
          </div>
        </template>
        <template #started-cell="{ row }">
          <span class="text-sm">{{ row.original.started ? new Date(row.original.started).toLocaleString() : '—' }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
