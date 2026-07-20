<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  host: '',
  port: null as number | null,
  database: '',
  user: '',
  password: '',
  domain: '',
  connectionTimeout: null as number | null,
  requestTimeout: null as number | null,
  encrypt: false,
  trustServerCertificate: false,
  parseJSON: false,
  stream: false,
})

const optionsOpen = ref(false)

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.host = c.host ?? ''
    form.port = c.port ?? null
    form.database = c.database ?? ''
    form.user = c.user ?? ''
    form.password = c.password ?? ''
    const o = c.options ?? {}
    form.domain = o.domain ?? ''
    form.connectionTimeout = o.connectionTimeout ?? null
    form.requestTimeout = o.requestTimeout ?? null
    form.encrypt = o.encrypt ?? false
    form.trustServerCertificate = o.trustServerCertificate ?? false
    form.parseJSON = o.parseJSON ?? false
    form.stream = o.stream ?? false
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'mssql' }
  if (form.host) body.host = form.host
  if (form.port !== null) body.port = form.port
  if (form.database) body.database = form.database
  if (form.user) body.user = form.user
  if (form.password) body.password = form.password
  const options: Record<string, any> = {}
  if (form.domain) options.domain = form.domain
  if (form.connectionTimeout !== null) options.connectionTimeout = form.connectionTimeout
  if (form.requestTimeout !== null) options.requestTimeout = form.requestTimeout
  if (form.encrypt) options.encrypt = true
  if (form.trustServerCertificate) options.trustServerCertificate = true
  if (form.parseJSON) options.parseJSON = true
  if (form.stream) options.stream = true
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Server to connect to">
        <UInput v-model="form.host" placeholder="mydbserver" class="w-full" />
      </UFormField>
      <UFormField label="Port" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Port (default: 1433). Not needed for named instances.">
        <UInput v-model.number="form.port" type="number" placeholder="1433" class="w-full" />
      </UFormField>
      <UFormField label="Database" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Database to connect to (default: dependent on server)">
        <UInput v-model="form.database" placeholder="mydatabase" class="w-full" />
      </UFormField>
      <UFormField label="User" orientation="horizontal" :ui="{ description: 'text-xs' }" description="User name for authentication">
        <UInput v-model="form.user" placeholder="sa" class="w-full" />
      </UFormField>
      <UFormField label="Password" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Password for authentication" class="col-span-2">
        <UInput v-model="form.password" type="password" placeholder="password" class="w-full" />
      </UFormField>
    </div>
    <div class="border-t border-default pt-4">
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="optionsOpen = !optionsOpen">
        <UIcon :name="optionsOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-muted" />
        <span class="text-sm font-medium">Options</span>
        <span class="text-[10px] text-muted">(7 parameters)</span>
      </div>
      <div v-if="optionsOpen" class="mt-3 grid grid-cols-1 gap-4">
        <UFormField label="Domain" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Domain for domain login to SQL Server">
          <UInput v-model="form.domain" placeholder="DOMAIN" class="w-full" />
        </UFormField>
        <UFormField label="Connection Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Connection timeout in milliseconds (default: 15000)">
          <UInput v-model.number="form.connectionTimeout" type="number" placeholder="15000" class="w-full" />
        </UFormField>
        <UFormField label="Request Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Request timeout in milliseconds (default: 15000)">
          <UInput v-model.number="form.requestTimeout" type="number" placeholder="15000" class="w-full" />
        </UFormField>
        <UFormField label="Encrypt" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Use true for Azure">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.encrypt" />
            <span class="text-xs text-muted">{{ form.encrypt ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Trust Server Certificate" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Use true for local dev / self-signed certs">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.trustServerCertificate" />
            <span class="text-xs text-muted">{{ form.trustServerCertificate ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Parse JSON" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Parse JSON recordsets to JS objects">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.parseJSON" />
            <span class="text-xs text-muted">{{ form.parseJSON ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Stream" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Stream recordsets/rows instead of returning them all at once">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.stream" />
            <span class="text-xs text-muted">{{ form.stream ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
      </div>
    </div>
  </div>
</template>
