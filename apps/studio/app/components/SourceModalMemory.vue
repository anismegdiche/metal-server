<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  database: '',
  autocreate: false,
})

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.database = c.database ?? ''
    const o = c.options ?? {}
    form.autocreate = o.autocreate ?? false
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'memory' }
  if (form.database) body.database = form.database
  const options: Record<string, any> = {}
  if (form.autocreate) options.autocreate = true
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Database" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Name of the database. If not set, uses source name as database name" class="col-span-2">
        <UInput v-model="form.database" placeholder="mydb (defaults to source name)" class="w-full" />
      </UFormField>
      <UFormField label="Autocreate" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Auto-create entities on first interaction (default: false)" class="col-span-2">
        <div class="flex items-center gap-2">
          <USwitch v-model="form.autocreate" />
          <span class="text-xs text-muted">{{ form.autocreate ? 'Yes' : 'No' }}</span>
        </div>
      </UFormField>
    </div>
  </div>
</template>
