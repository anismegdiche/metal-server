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
  connectionTimeoutMillis: null as number | null,
  idleTimeoutMillis: null as number | null,
  max: null as number | null,
  allowExitOnIdle: true,
  statement_timeout: null as number | null,
  query_timeout: null as number | null,
  application_name: '',
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
    form.connectionTimeoutMillis = o.connectionTimeoutMillis ?? null
    form.idleTimeoutMillis = o.idleTimeoutMillis ?? null
    form.max = o.max ?? null
    form.allowExitOnIdle = o.allowExitOnIdle ?? true
    form.statement_timeout = o.statement_timeout ?? null
    form.query_timeout = o.query_timeout ?? null
    form.application_name = o.application_name ?? ''
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'postgres' }
  if (form.host) body.host = form.host
  if (form.port !== null) body.port = form.port
  if (form.database) body.database = form.database
  if (form.user) body.user = form.user
  if (form.password) body.password = form.password
  const options: Record<string, any> = {}
  if (form.connectionTimeoutMillis !== null) options.connectionTimeoutMillis = form.connectionTimeoutMillis
  if (form.idleTimeoutMillis !== null) options.idleTimeoutMillis = form.idleTimeoutMillis
  if (form.max !== null) options.max = form.max
  if (!form.allowExitOnIdle) options.allowExitOnIdle = false
  if (form.statement_timeout !== null) options.statement_timeout = form.statement_timeout
  if (form.query_timeout !== null) options.query_timeout = form.query_timeout
  if (form.application_name) options.application_name = form.application_name
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Server to connect to">
        <UInput v-model="form.host" placeholder="localhost" class="w-full" />
      </UFormField>
      <UFormField label="Port" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Port (default: 5432)">
        <UInput v-model.number="form.port" type="number" placeholder="5432" class="w-full" />
      </UFormField>
      <UFormField label="Database" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Database to connect to">
        <UInput v-model="form.database" placeholder="mydb" class="w-full" />
      </UFormField>
      <UFormField label="User" orientation="horizontal" :ui="{ description: 'text-xs' }" description="User name for authentication">
        <UInput v-model="form.user" placeholder="postgres" class="w-full" />
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
        <UFormField label="Connection Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds to wait for connection (default: no timeout)">
          <UInput v-model.number="form.connectionTimeoutMillis" type="number" placeholder="30000" class="w-full" />
        </UFormField>
        <UFormField label="Idle Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds a client must sit idle before disconnecting (default: 10000)">
          <UInput v-model.number="form.idleTimeoutMillis" type="number" placeholder="10000" class="w-full" />
        </UFormField>
        <UFormField label="Max Connections" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum number of clients the pool should contain (default: 10)">
          <UInput v-model.number="form.max" type="number" placeholder="10" class="w-full" />
        </UFormField>
        <UFormField label="Allow Exit On Idle" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Allows the node event loop to exit when all clients are idle (default: true)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.allowExitOnIdle" />
            <span class="text-xs text-muted">{{ form.allowExitOnIdle ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Statement Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds before a statement will time out (default: no timeout)">
          <UInput v-model.number="form.statement_timeout" type="number" class="w-full" />
        </UFormField>
        <UFormField label="Query Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds before a query call will timeout (default: no timeout)">
          <UInput v-model.number="form.query_timeout" type="number" class="w-full" />
        </UFormField>
        <UFormField label="Application Name" orientation="horizontal" :ui="{ description: 'text-xs' }" description="The name of the application that created this Client instance">
          <UInput v-model="form.application_name" placeholder="metal" class="w-full" />
        </UFormField>
      </div>
    </div>
  </div>
</template>
