<script setup lang="ts">
const schedules = ref([
  { id: '1', name: 'Import Users', plan: 'Import Users', cron: '0 */6 * * *', status: 'active', lastFire: '2h ago', nextFire: '4h' },
  { id: '2', name: 'Sync Inventory', plan: 'Sync Inventory', cron: '*/30 * * * *', status: 'active', lastFire: '15m ago', nextFire: '15m' },
  { id: '3', name: 'Daily Report', plan: 'Daily Report', cron: '0 8 * * *', status: 'active', lastFire: '1d ago', nextFire: '16h' },
  { id: '4', name: 'Clean Logs', plan: 'Clean Logs', cron: '0 2 * * 0', status: 'paused', lastFire: '7d ago', nextFire: '\u2014' },
])

const showCreateModal = ref(false)
const newSchedule = ref({ name: '', plan: '', cron: '' })

const planItems = [
  { label: 'Import Users', value: 'Import Users' },
  { label: 'Sync Inventory', value: 'Sync Inventory' },
  { label: 'Daily Report', value: 'Daily Report' },
  { label: 'Clean Logs', value: 'Clean Logs' },
]

function toggleSchedule(id: string) {
  const schedule = schedules.value.find(s => s.id === id)
  if (schedule) {
    schedule.status = schedule.status === 'active' ? 'paused' : 'active'
  }
}

function deleteSchedule(id: string) {
  schedules.value = schedules.value.filter(s => s.id !== id)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold"><UIcon name="i-lucide-calendar-clock" class="ml-0 mr-2" />Scheduler</h1>
        <p class="text-sm text-muted">Manage scheduled plan executions</p>
      </div>
      <UButton icon="i-lucide-plus" label="Add Schedule" @click="() => { showCreateModal = true }" />
    </div>

    <UCard class="bg-metal-gradient">
      <UTable
        :columns="[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'plan', header: 'Plan' },
          { accessorKey: 'cron', header: 'Cron' },
          { accessorKey: 'status', header: 'Status' },
          { accessorKey: 'lastFire', header: 'Last Fire' },
          { accessorKey: 'nextFire', header: 'Next Fire' },
          { accessorKey: 'actions', header: '' },
        ]"
        :data="schedules"
      >
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'active' ? 'success' : 'warning'"
            variant="subtle"
            size="md"
          >
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #cron-cell="{ row }">
          <code class="text-xs font-mono bg-muted/30 px-1.5 py-0.5 rounded">{{ row.original.cron }}</code>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              :icon="row.original.status === 'active' ? 'i-lucide-pause' : 'i-lucide-play'"
              size="xs"
              variant="ghost"
              @click="toggleSchedule(row.original.id)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              @click="deleteSchedule(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4 flex flex-col gap-4">
          <h2 class="font-semibold">New Schedule</h2>
          <UFormField label="Name">
            <UInput v-model="newSchedule.name" placeholder="Schedule name" />
          </UFormField>
          <UFormField label="Plan">
            <USelect
              v-model="newSchedule.plan"
              :items="planItems"
              placeholder="Select plan"
            />
          </UFormField>
          <UFormField label="Cron Expression">
            <UInput v-model="newSchedule.cron" placeholder="0 */6 * * *" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" variant="ghost" @click="() => { showCreateModal = false }" />
            <UButton label="Create" @click="() => { showCreateModal = false }" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
