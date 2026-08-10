<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  host: '',
  database: '',
  key: '',
  partitionKey: '',
  maxRetries: null as number | null,
  requestTimeout: null as number | null,
  connectionMode: '',
  protocol: '',
  retryAfter: null as number | null,
})

const optionsOpen = ref(false)

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.host = c.host ?? ''
    form.database = c.database ?? ''
    const o = c.options ?? {}
    form.key = o.key ?? ''
    form.partitionKey = o.partitionKey ?? ''
    form.maxRetries = o.maxRetries ?? null
    form.requestTimeout = o.requestTimeout ?? null
    form.connectionMode = o.connectionMode ?? ''
    form.protocol = o.protocol ?? ''
    form.retryAfter = o.retryAfter ?? null
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'azure-cosmosdb' }
  if (form.host) body.host = form.host
  if (form.database) body.database = form.database
  const options: Record<string, any> = {}
  if (form.key) options.key = form.key
  if (form.partitionKey) options.partitionKey = form.partitionKey
  if (form.maxRetries !== null) options.maxRetries = form.maxRetries
  if (form.requestTimeout !== null) options.requestTimeout = form.requestTimeout
  if (form.connectionMode) options.connectionMode = form.connectionMode
  if (form.protocol) options.protocol = form.protocol
  if (form.retryAfter !== null) options.retryAfter = form.retryAfter
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="The endpoint URL of your CosmosDB account" class="col-span-2">
        <UInput v-model="form.host" placeholder="https://your-account.documents.azure.com" class="w-full" />
      </UFormField>
      <UFormField label="Database" orientation="horizontal" :ui="{ description: 'text-xs' }" description="The name of the database to connect to">
        <UInput v-model="form.database" placeholder="mydatabase" class="w-full" />
      </UFormField>
      <UFormField label="Key" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Primary or secondary key for your CosmosDB account">
        <UInput v-model="form.key" type="password" placeholder="primary or secondary key" class="w-full" />
      </UFormField>
    </div>
    <div class="border-t border-default pt-4">
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="optionsOpen = !optionsOpen">
        <UIcon :name="optionsOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-muted" />
        <span class="text-sm font-medium">Options</span>
        <span class="text-[10px] text-muted">(6 parameters)</span>
      </div>
      <div v-if="optionsOpen" class="mt-3 grid grid-cols-1 gap-4">
        <UFormField label="Partition Key" orientation="horizontal" :ui="{ description: 'text-xs' }" description="The partition key path for the container">
          <UInput v-model="form.partitionKey" placeholder="/id" class="w-full" />
        </UFormField>
        <UFormField label="Max Retries" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum number of retries for failed operations (default: 3)">
          <UInput v-model.number="form.maxRetries" type="number" placeholder="3" class="w-full" />
        </UFormField>
        <UFormField label="Request Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Request timeout in milliseconds (default: 60000)">
          <UInput v-model.number="form.requestTimeout" type="number" placeholder="60000" class="w-full" />
        </UFormField>
        <UFormField label="Connection Mode" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Connection mode: Direct or Gateway (default: Direct)">
          <UInput v-model="form.connectionMode" placeholder="Direct" class="w-full" />
        </UFormField>
        <UFormField label="Protocol" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Protocol to use: Tcp or Http (default: Tcp)">
          <UInput v-model="form.protocol" placeholder="Tcp" class="w-full" />
        </UFormField>
        <UFormField label="Retry After (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Time to wait between retries in milliseconds (default: 1000)">
          <UInput v-model.number="form.retryAfter" type="number" placeholder="1000" class="w-full" />
        </UFormField>
      </div>
    </div>
  </div>
</template>
