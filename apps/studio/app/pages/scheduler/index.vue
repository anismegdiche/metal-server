<script setup lang="ts">
type SchedulesResponse = Record<string, { plan: string; cron: string }>
type PlansResponse = Record<string, { steps: any[]; [key: string]: any }>

const schedules = ref<SchedulesResponse>({})
const plans = ref<PlansResponse>({})
const loading = ref(true)

const showCreateModal = ref(false)
const editingName = ref<string | null>(null)
const newSchedule = ref({ name: '', plan: '' })

const cronMode = ref<'preset' | 'interval' | 'cron'>('preset')
const cronPreset = ref('@daily')
const intervalValue = ref(30)
const intervalUnit = ref('m')
const cronMinute = ref('0')
const cronHour = ref('8')
const cronDay = ref('*')
const cronMonth = ref('*')
const cronWeekday = ref('*')
const cronSecond = ref('0')
const useSeconds = ref(false)

const presetOptions = [
  { label: '@start', value: '@start', description: 'Run once on server start' },
  { label: '@hourly', value: '@hourly', description: 'Every hour at :00' },
  { label: '@daily', value: '@daily', description: 'Every day at midnight' },
  { label: '@weekly', value: '@weekly', description: 'Every Sunday at midnight' },
  { label: '@monthly', value: '@monthly', description: '1st of every month' },
  { label: '@yearly', value: '@yearly', description: 'January 1st each year' },
]

const intervalUnitOptions = [
  { label: 'seconds', value: 's' },
  { label: 'minutes', value: 'm' },
  { label: 'hours', value: 'h' },
]

const secondOptions = [
  { label: 'Every second (*)', value: '*' },
  { label: 'Every 5 sec (*/5)', value: '*/5' },
  { label: 'Every 10 sec (*/10)', value: '*/10' },
  { label: 'Every 15 sec (*/15)', value: '*/15' },
  { label: 'Every 30 sec (*/30)', value: '*/30' },
  ...Array.from({ length: 60 }, (_, i) => ({ label: String(i), value: String(i) })),
]

const minuteOptions = [
  { label: 'Every minute (*)', value: '*' },
  { label: 'Every 5 min (*/5)', value: '*/5' },
  { label: 'Every 10 min (*/10)', value: '*/10' },
  { label: 'Every 15 min (*/15)', value: '*/15' },
  { label: 'Every 30 min (*/30)', value: '*/30' },
  ...Array.from({ length: 60 }, (_, i) => ({ label: String(i), value: String(i) })),
]

const hourOptions = [
  { label: 'Every hour (*)', value: '*' },
  { label: 'Every 2 hours (*/2)', value: '*/2' },
  { label: 'Every 3 hours (*/3)', value: '*/3' },
  { label: 'Every 6 hours (*/6)', value: '*/6' },
  { label: 'Every 12 hours (*/12)', value: '*/12' },
  ...Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, '0') + ':00', value: String(i) })),
]

const dayOptions = [
  { label: 'Every day (*)', value: '*' },
  ...Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`, value: String(i + 1) })),
  { label: 'Last day (L)', value: 'L' },
]

const monthOptions = [
  { label: 'Every month (*)', value: '*' },
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
]

const weekdayOptions = [
  { label: 'Every day', value: '*' },
  { label: 'Sun', value: '0' },
  { label: 'Mon', value: '1' },
  { label: 'Tue', value: '2' },
  { label: 'Wed', value: '3' },
  { label: 'Thu', value: '4' },
  { label: 'Fri', value: '5' },
  { label: 'Sat', value: '6' },
  { label: 'Weekdays', value: '1-5' },
  { label: 'Weekends', value: '0,6' },
]

const planItems = computed(() =>
  Object.keys(plans.value).map((name) => ({ label: name, value: name }))
)

const scheduleRows = computed(() =>
  Object.entries(schedules.value).map(([name, config]) => ({
    name,
    plan: config.plan,
    cron: config.cron,
  }))
)

const builtCron = computed(() => {
  if (cronMode.value === 'preset') return cronPreset.value
  if (cronMode.value === 'interval') return `@every ${intervalValue.value}${intervalUnit.value}`
  const fields = [cronMinute.value, cronHour.value, cronDay.value, cronMonth.value, cronWeekday.value]
  if (useSeconds.value) fields.unshift(cronSecond.value)
  return fields.join(' ')
})

const cronDescription = computed(() => {
  const c = builtCron.value
  if (c.startsWith('@')) {
    const map: Record<string, string> = {
      '@start': 'Runs once when the server starts',
      '@hourly': 'Runs at the start of every hour',
      '@daily': 'Runs once a day at midnight',
      '@weekly': 'Runs once a week on Sunday at midnight',
      '@monthly': 'Runs once a month on the 1st at midnight',
      '@yearly': 'Runs once a year on January 1st at midnight',
    }
    if (map[c]) return map[c]
    const everyMatch = c.match(/@every (\d+)(s|m|h)/)
    if (everyMatch) {
      const val = everyMatch[1]
      const unit = everyMatch[2]
      const unitName = { s: 'second', m: 'minute', h: 'hour' }[unit]
      if (Number.parseInt(val) === 1) return `Runs every ${unitName}`
      return `Runs every ${val} ${unitName}s`
    }
    return ''
  }
  const parts = c.split(' ')
  if (parts.length < 5 || parts.length > 6) return ''

  const hasSeconds = parts.length === 6
  const [secOrMin, minOrHour, hourOrDay, dayOrMonth, monthOrDow, dow] = hasSeconds
    ? [parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]]
    : ['*', parts[0], parts[1], parts[2], parts[3], parts[4]]
  const min = minOrHour
  const hour = hourOrDay
  const day = dayOrMonth
  const month = monthOrDow

  const describe = (val: string, unit: string) => {
    if (val === '*') return `every ${unit}`
    if (val.startsWith('*/')) return `every ${val.slice(2)} ${unit}s`
    return val
  }

  const timeParts = []
  if (hasSeconds) {
    if (secOrMin !== '*') timeParts.push(`at second ${describe(secOrMin, 'second')}`)
    else timeParts.push('every second')
  }
  timeParts.push(describe(min, 'minute'))
  timeParts.push(`at hour ${describe(hour, 'hour')}`)
  const dowMap: Record<string, string> = {
    '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
    '4': 'Thursday', '5': 'Friday', '6': 'Saturday',
    '1-5': 'weekdays', '0,6': 'weekends',
  }
  const dowStr = dowMap[dow] ?? (dow === '*' ? 'every day' : dow)
  if (day !== '*') timeParts.push(`on day ${describe(day, 'day')}`)
  if (month !== '*') timeParts.push(`in ${describe(month, 'month')}`)
  if (dow !== '*') timeParts.push(`on ${dowStr}`)
  return timeParts.join(', ')
})

const isEditing = computed(() => editingName.value !== null)
const modalTitle = computed(() => isEditing.value ? 'Edit Schedule' : 'New Schedule')
const modalSubmitLabel = computed(() => isEditing.value ? 'Save Changes' : 'Create Schedule')
const isValid = computed(() => newSchedule.value.name && newSchedule.value.plan)

async function fetchData() {
  loading.value = true
  try {
    const [s, p] = await Promise.all([
      $fetch<SchedulesResponse>('/server-api/api/config/schedules'),
      $fetch<PlansResponse>('/server-api/api/config/plans'),
    ])
    schedules.value = s
    plans.value = p
  } catch (e) {
    console.error('Failed to load schedules/plans:', e)
  } finally {
    loading.value = false
  }
}

function parseCronToFields(cron: string) {
  if (cron.startsWith('@every ')) {
    const match = cron.match(/@every (\d+)(s|m|h)/)
    if (match) {
      cronMode.value = 'interval'
      intervalValue.value = Number.parseInt(match[1])
      intervalUnit.value = match[2]
    }
  } else if (cron.startsWith('@')) {
    cronMode.value = 'preset'
    cronPreset.value = cron
  } else {
    cronMode.value = 'cron'
    const parts = cron.split(' ')
    const hasSeconds = parts.length === 6
    if (hasSeconds) {
      useSeconds.value = true
      cronSecond.value = parts[0]
      cronMinute.value = parts[1]
      cronHour.value = parts[2]
      cronDay.value = parts[3]
      cronMonth.value = parts[4]
      cronWeekday.value = parts[5]
    } else {
      useSeconds.value = false
      cronMinute.value = parts[0]
      cronHour.value = parts[1]
      cronDay.value = parts[2]
      cronMonth.value = parts[3]
      cronWeekday.value = parts[4]
    }
  }
}

function openCreateModal() {
  editingName.value = null
  newSchedule.value = { name: '', plan: '' }
  resetCronFields()
  showCreateModal.value = true
}

function openEditModal(name: string) {
  editingName.value = name
  const config = schedules.value[name]
  newSchedule.value = { name, plan: config.plan }
  parseCronToFields(config.cron)
  showCreateModal.value = true
}

function resetCronFields() {
  cronMode.value = 'preset'
  cronPreset.value = '@daily'
  intervalValue.value = 30
  intervalUnit.value = 'm'
  useSeconds.value = false
  cronSecond.value = '0'
  cronMinute.value = '0'
  cronHour.value = '8'
  cronDay.value = '*'
  cronMonth.value = '*'
  cronWeekday.value = '*'
}

async function submitSchedule() {
  if (!isValid.value) return
  const name = newSchedule.value.name
  const body = { plan: newSchedule.value.plan, cron: builtCron.value }
  try {
    await $fetch(`/server-api/api/config/schedules/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body,
    })
    showCreateModal.value = false
    await fetchData()
  } catch (e) {
    console.error('Failed to save schedule:', e)
  }
}

async function deleteSchedule(name: string) {
  try {
    await $fetch(`/server-api/api/config/schedules/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    await fetchData()
  } catch (e) {
    console.error('Failed to delete schedule:', e)
  }
}

await fetchData()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold"><UIcon name="i-lucide-calendar-clock" class="ml-0 mr-2" />Scheduler</h1>
        <p class="text-sm text-muted">Manage scheduled plan executions</p>
      </div>
      <UButton icon="i-lucide-plus" label="Add Schedule" @click="openCreateModal" />
    </div>

    <UCard class="bg-metal-gradient">
      <UTable
        :columns="[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'plan', header: 'Plan' },
          { accessorKey: 'cron', header: 'Schedule' },
          { accessorKey: 'actions', header: '' },
        ]"
        :data="scheduleRows"
        :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }"
      >
        <template #cron-cell="{ row }">
          <code class="text-xs font-mono bg-muted/30 px-1.5 py-0.5 rounded">{{ row.original.cron }}</code>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditModal(row.original.name)" />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              @click="deleteSchedule(row.original.name)"
            />
          </div>
        </template>
      </UTable>
      <div v-if="!loading && scheduleRows.length === 0" class="text-center py-8 text-sm text-muted">
        No schedules configured yet
      </div>
    </UCard>

    <UModal v-model:open="showCreateModal" :ui="{ content: 'w-full max-w-xl' }">
      <template #content>
        <div class="p-4 flex flex-col gap-5">
          <div>
            <h2 class="font-semibold text-lg">{{ modalTitle }}</h2>
            <p class="text-xs text-muted">Configure when this schedule should run</p>
          </div>

          <div class="flex flex-col gap-4">
            <UFormField label="Name" description="A descriptive name for this schedule" orientation="horizontal">
              <UInput v-model="newSchedule.name" placeholder="e.g. Daily Data Sync" :disabled="isEditing" />
            </UFormField>

            <UFormField label="Plan" description="The plan to run when this schedule fires" orientation="horizontal">
              <USelect v-model="newSchedule.plan" :items="planItems" placeholder="Select a plan to run" />
            </UFormField>
          </div>

          <div class="flex flex-col gap-3">
            <label class="text-sm font-medium">When to run</label>
            <div class="grid grid-cols-3 rounded-lg bg-muted/20 p-0.5">
              <button
                class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                :class="cronMode === 'preset' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'"
                @click="cronMode = 'preset'"
              >
                Preset
              </button>
              <button
                class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                :class="cronMode === 'interval' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'"
                @click="cronMode = 'interval'"
              >
                Interval
              </button>
              <button
                class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                :class="cronMode === 'cron' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'"
                @click="cronMode = 'cron'"
              >
                Cron
              </button>
            </div>

            <div v-if="cronMode === 'preset'" class="grid grid-cols-2 gap-1.5">
              <button
                v-for="preset in presetOptions"
                :key="preset.value"
                class="flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors"
                :class="cronPreset === preset.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'"
                @click="cronPreset = preset.value"
              >
                <code class="text-xs font-mono font-medium">{{ preset.label }}</code>
                <span class="text-[10px] text-muted">{{ preset.description }}</span>
              </button>
            </div>

            <div v-if="cronMode === 'interval'" class="flex items-center gap-2">
              <span class="text-sm text-muted">Every</span>
              <UInput
                v-model="intervalValue"
                type="number"
                :min="1"
                class="w-20"
                size="sm"
              />
              <USelect
                v-model="intervalUnit"
                :items="intervalUnitOptions"
                size="sm"
                class="w-28"
              />
            </div>

            <div v-if="cronMode === 'cron'" class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <USwitch v-model="useSeconds" size="xs" />
                <label class="text-[10px] text-muted">Include seconds</label>
              </div>
              <div class="grid gap-2" :class="useSeconds ? 'grid-cols-6' : 'grid-cols-5'">
                <div v-if="useSeconds" class="flex flex-col gap-1">
                  <label class="text-[10px] text-muted uppercase tracking-wide">Sec</label>
                  <USelect v-model="cronSecond" :items="secondOptions" size="xs" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-muted uppercase tracking-wide">Min</label>
                  <USelect v-model="cronMinute" :items="minuteOptions" size="xs" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-muted uppercase tracking-wide">Hour</label>
                  <USelect v-model="cronHour" :items="hourOptions" size="xs" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-muted uppercase tracking-wide">Day</label>
                  <USelect v-model="cronDay" :items="dayOptions" size="xs" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-muted uppercase tracking-wide">Month</label>
                  <USelect v-model="cronMonth" :items="monthOptions" size="xs" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] text-muted uppercase tracking-wide">Weekday</label>
                  <USelect v-model="cronWeekday" :items="weekdayOptions" size="xs" />
                </div>
              </div>
              <p class="text-[10px] text-muted">{{ useSeconds ? '6-field format: sec min hour day month weekday' : '5-field format: min hour day month weekday' }}</p>
            </div>
          </div>

          <div class="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10 p-3">
            <div class="flex items-center gap-2 mb-1">
              <code class="text-sm font-mono font-semibold text-primary">{{ builtCron }}</code>
            </div>
            <p class="text-xs text-muted">{{ cronDescription }}</p>
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <UButton label="Cancel" variant="ghost" @click="showCreateModal = false" />
            <UButton :label="modalSubmitLabel" :disabled="!isValid" @click="submitSchedule" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
