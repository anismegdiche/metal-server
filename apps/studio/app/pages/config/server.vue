<script setup lang="ts">
const { data: serverInfo, refresh } = useMetricsPolling('/server-api/server/info', 10000)

const port = ref(3000)
const timezone = ref('UTC')
const verbosity = ref('warn')
const requestLimit = ref('10mb')
const responseLimit = ref('10mb')
const responseChunk = ref(false)

const rateWindowMs = ref(60000)
const rateMax = ref(600)
const rateMessage = ref('Too many requests from this IP, please try again later')

const authProvider = ref('local')
const authDefaultRole = ref('')
const oidcIssuer = ref('')
const oidcClientId = ref('')
const oidcClientSecret = ref('')
const oidcScope = ref('')
const oidcRolesPath = ref('')

const cacheEnabled = ref(false)
const cacheProvider = ref('postgres')
const cacheHost = ref('localhost')
const cachePort = ref(5432)
const cacheDatabase = ref('')
const cacheUser = ref('')
const cachePassword = ref('')

const aiEnginesEnabled = ref(false)
const aiEnginesUrl = ref('')
const aiEnginesTimeout = ref(30000)
const aiEnginesSleep = ref(5000)
const aiEnginesMinInstance = ref(1)
const aiEnginesMaxInstance = ref(4)
const aiEnginesCpuScaleUp = ref(70)
const aiEnginesCpuScaleDown = ref(30)
const aiEnginesScaleInterval = ref(30000)
const aiEnginesScaleDownGracePeriod = ref(30000)
const aiEnginesCpu = ref(2)
const aiEnginesMemory = ref(4)
const aiEnginesBuildBatchSize = ref(3)
const aiEnginesCorsOrigins = ref('*')
const aiEnginesCorsMethods = ref('GET,POST,PUT,DELETE')
const aiEnginesCorsHeaders = ref('Content-Type,Authorization')

const verbosityItems = [
  { label: 'trace', value: 'trace' },
  { label: 'debug', value: 'debug' },
  { label: 'info', value: 'info' },
  { label: 'warn', value: 'warn' },
  { label: 'error', value: 'error' },
]

const authProviderItems = [
  { label: 'Local', value: 'local' },
  { label: 'Demo', value: 'demo' },
  { label: 'OIDC', value: 'oidc' },
]

const cacheProviderItems = [
  { label: 'Postgres', value: 'postgres' },
  { label: 'SQLite', value: 'sqlite' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-sliders-horizontal" title="Server Configuration" description="Configure server settings from metal.yaml" />
      <UButton icon="i-lucide-save" label="Save" size="sm" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- General -->
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-server" class="size-4 text-primary" />
            <h2 class="font-semibold text-sm">General</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <!---->
          <UFormField label="Port" description="Server TCP port" size="md" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="port" label="Ports" type="number" />
          </UFormField>
          <UFormField label="Timezone" description="Default timezone for schedules" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="timezone" placeholder="UTCs" />
          </UFormField>
          <UFormField label="Verbosity" description="Console logging level" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <USelect v-model="verbosity" :items="verbosityItems" />
          </UFormField>
          <UFormField label="Request Limit" description="Max request body size (e.g. 10mb)" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="requestLimit" placeholder="10mb" />
          </UFormField>
          <UFormField label="Response Limit" description="Max response body size (e.g. 10mb)" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="responseLimit" placeholder="10mb" />
          </UFormField>
          <UFormField label="Response Chunk" description="Enable chunked transfer encoding" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <USwitch v-model="responseChunk" />
          </UFormField>
        </div>
      </UCard>

      <!-- Authentication -->
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="size-4 text-success" />
            <h2 class="font-semibold text-sm">Authentication</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Provider" description="Authentication provider type" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <USelect v-model="authProvider" :items="authProviderItems" />
          </UFormField>
          <UFormField label="Default Role" description="Role assigned to authenticated users" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="authDefaultRole" placeholder="e.g. user" />
          </UFormField>
          <template v-if="authProvider === 'oidc'">
            <USeparator label="OIDC Settings" />
            <UFormField label="Issuer" description="OpenID Connect issuer URL" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="oidcIssuer" placeholder="https://accounts.google.com" />
            </UFormField>
            <UFormField label="Client ID" description="OAuth2 client ID" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="oidcClientId" placeholder="client-id" />
            </UFormField>
            <UFormField label="Client Secret" description="OAuth2 client secret" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="oidcClientSecret" type="password" placeholder="client-secret" />
            </UFormField>
            <UFormField label="Scope" description="Space-separated scopes (optional)" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="oidcScope" placeholder="openid profile email" />
            </UFormField>
            <UFormField label="Roles Path" description="JSON path to roles in token (optional)" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="oidcRolesPath" placeholder="e.g. resource_access.myapp.roles" />
            </UFormField>
          </template>
        </div>
      </UCard>

      <!-- Rate Limiting -->
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-gauge" class="size-4 text-warning" />
            <h2 class="font-semibold text-sm">Rate Limiting</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Window (ms)" description="Time window in milliseconds" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="rateWindowMs" type="number" />
          </UFormField>
          <UFormField label="Max Requests" description="Max requests per window" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="rateMax" type="number" />
          </UFormField>
          <UFormField label="Message" description="Response when rate limit exceeded" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <UInput v-model="rateMessage" />
          </UFormField>
        </div>
      </UCard>

      <!-- Cache -->
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-database" class="size-4 text-info" />
            <h2 class="font-semibold text-sm">Cache</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Enabled" description="Enable cache backend" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <USwitch v-model="cacheEnabled" />
          </UFormField>
          <template v-if="cacheEnabled">
            <UFormField label="Provider" description="Cache storage provider" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <USelect v-model="cacheProvider" :items="cacheProviderItems" />
            </UFormField>
            <UFormField label="Host" description="Cache server hostname" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="cacheHost" placeholder="localhost" />
            </UFormField>
            <UFormField label="Port" description="Cache server port" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="cachePort" type="number" />
            </UFormField>
            <UFormField label="Database" description="Database name" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="cacheDatabase" placeholder="metal_cache" />
            </UFormField>
            <UFormField label="User" description="Database user" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="cacheUser" placeholder="postgres" />
            </UFormField>
            <UFormField label="Password" description="Database password" orientation="horizontal" :ui="{ description: 'text-xs' }">
              <UInput v-model="cachePassword" type="password" />
            </UFormField>
          </template>
        </div>
      </UCard>

      <!-- AI Engines -->
      <UCard class="bg-metal-gradient lg:col-span-2">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-brain" class="size-4 text-error" />
            <h2 class="font-semibold text-sm">AI Engines</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Enabled" description="Enable AI engine support" orientation="horizontal" :ui="{ description: 'text-xs' }">
            <USwitch v-model="aiEnginesEnabled" />
          </UFormField>
          <template v-if="aiEnginesEnabled">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="flex flex-col gap-4">
                <USeparator label="Endpoint" />
                <UFormField label="Engines URL" description="Base URL for AI engine service" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesUrl" placeholder="http://localhost:8080" />
                </UFormField>
                <UFormField label="Timeout (ms)" description="Request timeout" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesTimeout" type="number" />
                </UFormField>
                <UFormField label="Sleep (ms)" description="Sleep between health checks (5000-600000)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesSleep" type="number" />
                </UFormField>
                <UFormField label="Build Batch Size" description="Tasks per build batch (1-10)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesBuildBatchSize" type="number" :min="1" :max="10" />
                </UFormField>
              </div>
              <div class="flex flex-col gap-4">
                <USeparator label="CORS" />
                <UFormField label="Allowed Origins" description="Comma-separated origins" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCorsOrigins" placeholder="*" />
                </UFormField>
                <UFormField label="Allowed Methods" description="Comma-separated HTTP methods" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCorsMethods" placeholder="GET,POST,PUT,DELETE" />
                </UFormField>
                <UFormField label="Allowed Headers" description="Comma-separated headers" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCorsHeaders" placeholder="Content-Type,Authorization" />
                </UFormField>
              </div>
              <div class="flex flex-col gap-4">
                <USeparator label="Orchestrator" />
                <UFormField label="Min Instances" description="Minimum running instances" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesMinInstance" type="number" :min="1" />
                </UFormField>
                <UFormField label="Max Instances" description="Maximum running instances" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesMaxInstance" type="number" />
                </UFormField>
                <UFormField label="CPU Scale Up (%)" description="CPU threshold to scale up (10-100)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCpuScaleUp" type="number" :min="10" :max="100" />
                </UFormField>
                <UFormField label="CPU Scale Down (%)" description="CPU threshold to scale down (0-50)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCpuScaleDown" type="number" :min="0" :max="50" />
                </UFormField>
                <UFormField label="Scale Interval (ms)" description="Check interval (5000-600000)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesScaleInterval" type="number" />
                </UFormField>
                <UFormField label="Scale Down Grace (ms)" description="Grace period before scaling down (5000-600000)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesScaleDownGracePeriod" type="number" />
                </UFormField>
              </div>
              <div class="flex flex-col gap-4">
                <USeparator label="Instance Resources" />
                <UFormField label="CPU (cores)" description="CPU cores per instance (1-64)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCpu" type="number" :min="1" :max="64" />
                </UFormField>
                <UFormField label="Memory (GB)" description="Memory per instance (1-128)" orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesMemory" type="number" :min="1" :max="128" />
                </UFormField>
              </div>
            </div>
          </template>
        </div>
      </UCard>
    </div>
  </div>
</template>
