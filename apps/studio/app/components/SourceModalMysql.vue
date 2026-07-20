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
  waitForConnections: true,
  connectionLimit: null as number | null,
  maxIdle: null as number | null,
  idleTimeout: null as number | null,
  queueLimit: null as number | null,
  enableKeepAlive: true,
  keepAliveInitialDelay: null as number | null,
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
    form.waitForConnections = o.waitForConnections ?? true
    form.connectionLimit = o.connectionLimit ?? null
    form.maxIdle = o.maxIdle ?? null
    form.idleTimeout = o.idleTimeout ?? null
    form.queueLimit = o.queueLimit ?? null
    form.enableKeepAlive = o.enableKeepAlive ?? true
    form.keepAliveInitialDelay = o.keepAliveInitialDelay ?? null
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'mysql' }
  if (form.host) body.host = form.host
  if (form.port !== null) body.port = form.port
  if (form.database) body.database = form.database
  if (form.user) body.user = form.user
  if (form.password) body.password = form.password
  const options: Record<string, any> = {}
  if (!form.waitForConnections) options.waitForConnections = false
  if (form.connectionLimit !== null) options.connectionLimit = form.connectionLimit
  if (form.maxIdle !== null) options.maxIdle = form.maxIdle
  if (form.idleTimeout !== null) options.idleTimeout = form.idleTimeout
  if (form.queueLimit !== null) options.queueLimit = form.queueLimit
  if (!form.enableKeepAlive) options.enableKeepAlive = false
  if (form.keepAliveInitialDelay !== null) options.keepAliveInitialDelay = form.keepAliveInitialDelay
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Server to connect to (default: 127.0.0.1)">
        <UInput v-model="form.host" placeholder="127.0.0.1" class="w-full" />
      </UFormField>
      <UFormField label="Port" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Port (default: 3306)">
        <UInput v-model.number="form.port" type="number" placeholder="3306" class="w-full" />
      </UFormField>
      <UFormField label="Database" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Database to connect to">
        <UInput v-model="form.database" placeholder="mydb" class="w-full" />
      </UFormField>
      <UFormField label="User" orientation="horizontal" :ui="{ description: 'text-xs' }" description="User name for authentication">
        <UInput v-model="form.user" placeholder="root" class="w-full" />
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
        <UFormField label="Wait For Connections" orientation="horizontal" :ui="{ description: 'text-xs' }" description="If true, pool queues connection requests when limit reached (default: true)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.waitForConnections" />
            <span class="text-xs text-muted">{{ form.waitForConnections ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Connection Limit" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum number of connections to create at once (default: 10)">
          <UInput v-model.number="form.connectionLimit" type="number" placeholder="10" class="w-full" />
        </UFormField>
        <UFormField label="Max Idle" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum number of idle connections (default: same as connectionLimit)">
          <UInput v-model.number="form.maxIdle" type="number" placeholder="10" class="w-full" />
        </UFormField>
        <UFormField label="Idle Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Idle connections timeout in milliseconds (default: 60000)">
          <UInput v-model.number="form.idleTimeout" type="number" placeholder="60000" class="w-full" />
        </UFormField>
        <UFormField label="Queue Limit" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum queued connection requests. 0 = no limit (default: 0)">
          <UInput v-model.number="form.queueLimit" type="number" placeholder="0" class="w-full" />
        </UFormField>
        <UFormField label="Enable Keep Alive" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Enable keep-alive on the socket (default: true)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.enableKeepAlive" />
            <span class="text-xs text-muted">{{ form.enableKeepAlive ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Keep Alive Initial Delay (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Initial delay before first TCP keepalive probe on an idle socket (default: 0)">
          <UInput v-model.number="form.keepAliveInitialDelay" type="number" placeholder="0" class="w-full" />
        </UFormField>
      </div>
    </div>
  </div>
</template>
