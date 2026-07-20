<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  host: '',
  user: '',
  password: '',
  database: '',
})

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.host = c.host ?? ''
    form.user = c.user ?? ''
    form.password = c.password ?? ''
    form.database = c.database ?? ''
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'metal' }
  if (form.host) body.host = form.host
  if (form.user) body.user = form.user
  if (form.password) body.password = form.password
  if (form.database) body.database = form.database
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="URL of the target server to connect to" class="col-span-2">
        <UInput v-model="form.host" placeholder="http://metalserver:3001" class="w-full" />
      </UFormField>
      <UFormField label="User" orientation="horizontal" :ui="{ description: 'text-xs' }" description="User name for authentication">
        <UInput v-model="form.user" placeholder="myapiuser" class="w-full" />
      </UFormField>
      <UFormField label="Password" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Password for authentication">
        <UInput v-model="form.password" type="password" placeholder="password" class="w-full" />
      </UFormField>
      <UFormField label="Database (Schema)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Name of the schema on the remote Metal server" class="col-span-2">
        <UInput v-model="form.database" placeholder="myschema" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>
