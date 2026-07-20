<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  host: '',
  type: 'rest',
  content: 'json',
})

const WS_ENDPOINT_TYPES = [
  { label: 'Session (Login)', value: 'session', required: false, description: 'Establishes connection and obtains auth tokens/session IDs' },
  { label: 'Collection Read', value: 'collection-read', required: true, description: 'Reads data from a collection' },
  { label: 'Item Create', value: 'item-create', required: false, description: 'Creates a new item' },
  { label: 'Item Update', value: 'item-update', required: false, description: 'Updates an existing item' },
  { label: 'Item Delete', value: 'item-delete', required: false, description: 'Deletes an existing item' },
] as const

const WS_REST_METHODS = [
  { label: 'GET', value: 'get' },
  { label: 'POST', value: 'post' },
  { label: 'PUT', value: 'put' },
  { label: 'PATCH', value: 'patch' },
  { label: 'DELETE', value: 'delete' },
]

interface WsEndpoint {
  method: string
  url: string
  data: string
  response: string
  sessionHeaders: { key: string; value: string }[]
}

interface WsEndpoints {
  session: WsEndpoint | null
  'collection-read': WsEndpoint
  'item-create': WsEndpoint | null
  'item-update': WsEndpoint | null
  'item-delete': WsEndpoint | null
}

const endpoints = ref<WsEndpoints>({
  session: null,
  'collection-read': newWsEndpoint(),
  'item-create': null,
  'item-update': null,
  'item-delete': null,
})
const endpointsOpen = ref(false)
const isSoap = computed(() => form.type === 'soap')

function newWsEndpoint(): WsEndpoint {
  return { method: 'get', url: '', data: '', response: '', sessionHeaders: [] }
}

function configToWsEndpoint(config: Record<string, any>): WsEndpoint {
  const ep = newWsEndpoint()
  const methodKeys = ['get', 'post', 'put', 'patch', 'delete']
  for (const mk of methodKeys) {
    if (config[mk] !== undefined) { ep.method = mk; ep.url = config[mk]; break }
  }
  if (config.data !== undefined) ep.data = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
  if (config.response !== undefined) ep.response = config.response
  if (config['session-headers']) {
    ep.sessionHeaders = Object.entries(config['session-headers']).map(([key, value]) => ({ key, value: String(value) }))
  }
  return ep
}

function wsEndpointToConfig(ep: WsEndpoint): Record<string, any> {
  const config: Record<string, any> = {}
  if (ep.url) config[ep.method] = ep.url
  else config[ep.method] = null
  if (ep.data) {
    try { config.data = JSON.parse(ep.data) } catch { config.data = ep.data }
  }
  if (ep.response) config.response = ep.response
  if (ep.sessionHeaders.length > 0) {
    const headers: Record<string, string> = {}
    for (const h of ep.sessionHeaders) {
      if (h.key && h.value) headers[h.key] = h.value
    }
    if (Object.keys(headers).length > 0) config['session-headers'] = headers
  }
  return config
}

function toggleWsEndpoint(key: keyof WsEndpoints) {
  const ep = endpoints.value[key]
  if (ep) (endpoints.value[key] as any) = null
  else endpoints.value[key] = newWsEndpoint()
}

function addSessionHeader() {
  if (!endpoints.value.session) return
  endpoints.value.session.sessionHeaders.push({ key: '', value: '' })
}

function removeSessionHeader(idx: number) {
  if (!endpoints.value.session) return
  endpoints.value.session.sessionHeaders.splice(idx, 1)
}

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.host = c.host ?? ''
    const o = c.options ?? {}
    form.type = o.type ?? 'rest'
    form.content = typeof o.content === 'string' ? o.content : (o.content?.['content-type'] ?? 'json')
    const wsEp = o.endpoints ?? {}
    endpoints.value = {
      session: wsEp.session ? configToWsEndpoint(wsEp.session) : null,
      'collection-read': wsEp['collection-read'] ? configToWsEndpoint(wsEp['collection-read']) : newWsEndpoint(),
      'item-create': wsEp['item-create'] ? configToWsEndpoint(wsEp['item-create']) : null,
      'item-update': wsEp['item-update'] ? configToWsEndpoint(wsEp['item-update']) : null,
      'item-delete': wsEp['item-delete'] ? configToWsEndpoint(wsEp['item-delete']) : null,
    }
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'webservice' }
  if (form.host) body.host = form.host
  body.options = { type: form.type, content: form.content }
  const eps: Record<string, any> = {}
  for (const [key, val] of Object.entries(endpoints.value)) {
    if (val) eps[key] = wsEndpointToConfig(val)
  }
  if (Object.keys(eps).length > 0) body.options.endpoints = eps
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Host" orientation="horizontal" :ui="{ description: 'text-xs' }" description="URL of the target server to connect to" class="col-span-2">
        <UInput v-model="form.host" placeholder="https://api.example.com" class="w-full" />
      </UFormField>
      <UFormField label="Type" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Type of webservice: rest (RESTful) or soap (SOAP)">
        <USelect v-model="form.type" :items="[{ label: 'REST', value: 'rest' }, { label: 'SOAP', value: 'soap' }]" class="w-full" />
      </UFormField>
      <UFormField label="Content Type" orientation="horizontal" :ui="{ description: 'text-xs' }" description="Response content type for parsing">
        <USelect v-model="form.content" :items="[{ label: 'JSON', value: 'json' }, { label: 'XML', value: 'xml' }]" class="w-full" />
      </UFormField>
    </div>
    <div class="border-t border-default pt-4">
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="endpointsOpen = !endpointsOpen">
        <UIcon :name="endpointsOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-muted" />
        <span class="text-sm font-medium">Endpoints</span>
        <span class="text-[10px] text-muted">(configure API endpoints)</span>
      </div>
      <div v-if="endpointsOpen" class="mt-3 space-y-4">
        <div v-for="epDef in WS_ENDPOINT_TYPES" :key="epDef.value">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <USwitch
                :model-value="endpoints[epDef.value] !== null"
                @update:model-value="toggleWsEndpoint(epDef.value)"
              />
              <span class="text-xs font-medium" :class="{ 'text-muted': endpoints[epDef.value] === null }">
                {{ epDef.label }}
              </span>
              <UBadge v-if="epDef.required" variant="subtle" color="primary" size="sm">Required</UBadge>
            </div>
            <span class="text-[10px] text-muted">{{ epDef.description }}</span>
          </div>
          <div v-if="endpoints[epDef.value]" class="ml-6 p-3 bg-elevated/30 rounded space-y-3">
            <div class="grid gap-3" :class="isSoap ? 'grid-cols-1' : 'grid-cols-2'">
              <UFormField :label="isSoap ? 'Operation Name' : 'Method'" orientation="horizontal">
                <USelect v-if="!isSoap" v-model="endpoints[epDef.value]!.method" :items="WS_REST_METHODS" size="sm" />
                <UInput v-else v-model="endpoints[epDef.value]!.method" :placeholder="isSoap ? 'listMovies, GetListByName...' : ''" size="sm" class="w-full" />
              </UFormField>
              <UFormField v-if="!isSoap" label="URL" orientation="horizontal">
                <UInput v-model="endpoints[epDef.value]!.url" :placeholder="epDef.value === 'session' ? '/user/login' : '/${{ $entity }}'" size="sm" class="w-full" />
              </UFormField>
            </div>
            <template v-if="epDef.value !== 'session'">
              <UFormField label="Response Path" orientation="horizontal">
                <UInput v-model="endpoints[epDef.value]!.response" placeholder="message, Envelope.Body.listMoviesResponse.${{ $entity }}s" class="w-full" size="sm" />
              </UFormField>
            </template>
            <template v-if="['session', 'collection-read', 'item-create', 'item-update', 'item-delete'].includes(epDef.value)">
              <UFormField label="Data" orientation="horizontal">
                <UTextarea v-model="endpoints[epDef.value]!.data" placeholder='JSON body (supports ${{ }} expressions)' class="w-full" :rows="3" size="sm" />
              </UFormField>
            </template>
            <template v-if="epDef.value === 'session'">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium">Session Headers</span>
                  <UButton icon="i-lucide-plus" label="Add" size="xs" variant="outline" @click="addSessionHeader" />
                </div>
                <div v-if="endpoints.session!.sessionHeaders.length === 0" class="text-[10px] text-muted italic">No session headers defined</div>
                <div v-for="(hdr, idx) in endpoints.session!.sessionHeaders" :key="idx" class="flex items-center gap-2 mb-1">
                  <UInput v-model="hdr.key" placeholder="Header name" size="sm" class="flex-1" />
                  <UInput v-model="hdr.value" :placeholder="'Header value (supports \${{ }})'" size="sm" class="flex-1" />
                  <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeSessionHeader(idx)" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
