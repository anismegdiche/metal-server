<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  host: '',
  database: '',
  connectTimeoutMS: null as number | null,
  socketTimeoutMS: null as number | null,
  maxPoolSize: null as number | null,
  minPoolSize: null as number | null,
  maxIdleTimeMS: null as number | null,
  keepAlive: true,
  keepAliveInitialDelay: null as number | null,
  tls: false,
  noDelay: true,
  directConnection: false,
  forceServerObjectId: false,
  ignoreUndefined: false,
  waitQueueTimeoutMS: null as number | null,
})

const optionsOpen = ref(false)

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.host = c.host ?? ''
    form.database = c.database ?? ''
    const o = c.options ?? {}
    form.connectTimeoutMS = o.connectTimeoutMS ?? null
    form.socketTimeoutMS = o.socketTimeoutMS ?? null
    form.maxPoolSize = o.maxPoolSize ?? null
    form.minPoolSize = o.minPoolSize ?? null
    form.maxIdleTimeMS = o.maxIdleTimeMS ?? null
    form.keepAlive = o.keepAlive ?? true
    form.keepAliveInitialDelay = o.keepAliveInitialDelay ?? null
    form.tls = o.tls ?? false
    form.noDelay = o.noDelay ?? true
    form.directConnection = o.directConnection ?? false
    form.forceServerObjectId = o.forceServerObjectId ?? false
    form.ignoreUndefined = o.ignoreUndefined ?? false
    form.waitQueueTimeoutMS = o.waitQueueTimeoutMS ?? null
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'mongodb' }
  if (form.host) body.host = form.host
  if (form.database) body.database = form.database
  const options: Record<string, any> = {}
  if (form.connectTimeoutMS !== null) options.connectTimeoutMS = form.connectTimeoutMS
  if (form.socketTimeoutMS !== null) options.socketTimeoutMS = form.socketTimeoutMS
  if (form.maxPoolSize !== null) options.maxPoolSize = form.maxPoolSize
  if (form.minPoolSize !== null) options.minPoolSize = form.minPoolSize
  if (form.maxIdleTimeMS !== null) options.maxIdleTimeMS = form.maxIdleTimeMS
  if (!form.keepAlive) options.keepAlive = false
  if (form.keepAliveInitialDelay !== null) options.keepAliveInitialDelay = form.keepAliveInitialDelay
  if (form.tls) options.tls = true
  if (!form.noDelay) options.noDelay = false
  if (form.directConnection) options.directConnection = true
  if (form.forceServerObjectId) options.forceServerObjectId = true
  if (form.ignoreUndefined) options.ignoreUndefined = true
  if (form.waitQueueTimeoutMS !== null) options.waitQueueTimeoutMS = form.waitQueueTimeoutMS
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="URI to connect to" class="col-span-2">
        <UInput v-model="form.host" placeholder="mongodb://localhost:27017/" class="w-full" />
      </UFormField>
      <UFormField label="Database" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Database to connect to (default: dependent on server)" class="col-span-2">
        <UInput v-model="form.database" placeholder="mydatabase" class="w-full" />
      </UFormField>
    </div>
    <div class="border-t border-default pt-4">
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="optionsOpen = !optionsOpen">
        <UIcon :name="optionsOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-muted" />
        <span class="text-sm font-medium">Options</span>
        <span class="text-[10px] text-muted">(13 parameters)</span>
      </div>
      <div v-if="optionsOpen" class="mt-3 grid grid-cols-1 gap-4">
        <UFormField label="Connect Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds to wait before timeout on a TCP connection (default: 30000)">
          <UInput v-model.number="form.connectTimeoutMS" type="number" placeholder="30000" class="w-full" />
        </UFormField>
        <UFormField label="Socket Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds to wait before timeout on a TCP socket (default: 360000)">
          <UInput v-model.number="form.socketTimeoutMS" type="number" placeholder="360000" class="w-full" />
        </UFormField>
        <UFormField label="Max Pool Size" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum number of connections in the pool (default: 100)">
          <UInput v-model.number="form.maxPoolSize" type="number" placeholder="100" class="w-full" />
        </UFormField>
        <UFormField label="Min Pool Size" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Minimum number of connections in the pool (default: 0)">
          <UInput v-model.number="form.minPoolSize" type="number" placeholder="0" class="w-full" />
        </UFormField>
        <UFormField label="Max Idle Time (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum time a connection can remain idle before being removed (default: infinite)">
          <UInput v-model.number="form.maxIdleTimeMS" type="number" class="w-full" />
        </UFormField>
        <UFormField label="Keep Alive" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Enable keepAlive on the TCP socket (default: true)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.keepAlive" />
            <span class="text-xs text-muted">{{ form.keepAlive ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Keep Alive Initial Delay (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Milliseconds to wait before initiating keepAlive on the TCP socket (default: 120000)">
          <UInput v-model.number="form.keepAliveInitialDelay" type="number" placeholder="120000" class="w-full" />
        </UFormField>
        <UFormField label="TLS" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Establish a TLS connection. Automatically true for DNS seedlist (SRV) URIs (default: false)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.tls" />
            <span class="text-xs text-muted">{{ form.tls ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="No Delay" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Use the TCP socket no-delay option (default: true)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.noDelay" />
            <span class="text-xs text-muted">{{ form.noDelay ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Direct Connection" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Force dispatch all operations to the host specified in the connection URI (default: false)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.directConnection" />
            <span class="text-xs text-muted">{{ form.directConnection ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Force Server ObjectId" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Force the server to assign _id values instead of the driver (default: false)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.forceServerObjectId" />
            <span class="text-xs text-muted">{{ form.forceServerObjectId ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Ignore Undefined" orientation="horizontal" :ui="{ description: 'text-xs' }" description="BSON serializer ignores undefined fields (default: false)">
          <div class="flex items-center gap-2">
            <USwitch v-model="form.ignoreUndefined" />
            <span class="text-xs text-muted">{{ form.ignoreUndefined ? 'Yes' : 'No' }}</span>
          </div>
        </UFormField>
        <UFormField label="Wait Queue Timeout (ms)" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Maximum time an operation can wait for a connection (default: 0)">
          <UInput v-model.number="form.waitQueueTimeoutMS" type="number" placeholder="0" class="w-full" />
        </UFormField>
      </div>
    </div>
  </div>
</template>
