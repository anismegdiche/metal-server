<script setup lang="ts">
const toast = useToast()

const loading = ref(true)
const saving = ref(false)

const port = ref(3000)
const timezone = ref("UTC")
const verbosity = ref("warn")
const requestLimit = ref("10mb")
const responseLimit = ref("10mb")
const responseChunk = ref(false)
const responseCompression = ref(true)

const rateWindowMs = ref(60000)
const rateMax = ref(600)
const rateMessage = ref("Too many requests from this IP, please try again later")

const authProvider = ref("local")
const authDefaultRole = ref("")
const oidcIssuer = ref("")
const oidcClientId = ref("")
const oidcClientSecret = ref("")
const oidcScope = ref("")
const oidcRolesPath = ref("")

const cacheProvider = ref("postgres")
const cacheConfig = ref<Record<string, any> | undefined>(undefined)
const cacheFieldsRef = ref<{ collectBody?: () => Record<string, any> } | null>(null)

const cacheProviders = ["postgres", "mysql", "mssql", "mongodb", "cosmosdb", "metal", "memory"]

const aiEnginesUrl = ref("")
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
const aiEnginesCorsOrigins = ref("*")
const aiEnginesCorsMethods = ref("GET,POST,PUT,DELETE")
const aiEnginesCorsHeaders = ref("Content-Type,Authorization")

const verbosityItems = [
  { label: "trace", value: "trace" },
  { label: "debug", value: "debug" },
  { label: "info", value: "info" },
  { label: "warn", value: "warn" },
  { label: "error", value: "error" },
]

const authProviderItems = [
  { label: "Local", value: "local" },
  { label: "Demo", value: "demo" },
  { label: "OIDC", value: "oidc" },
]

async function loadConfig() {
  loading.value = true
  try {
    const config = await $fetch<Record<string, any>>("/server-api/api/config/server")

    port.value = config.port ?? 3000
    timezone.value = config.timezone ?? "UTC"
    verbosity.value = config.verbosity ?? "warn"
    requestLimit.value = config["request-limit"] ?? "10mb"
    responseLimit.value = config["response-limit"] ?? "10mb"
    responseChunk.value = config["response-chunk"] ?? false
    responseCompression.value = config["response-compression"] ?? true

    const rate = config["response-rate"]
    rateWindowMs.value = rate?.windowMs ?? 60000
    rateMax.value = rate?.max ?? 600
    rateMessage.value = rate?.message ?? "Too many requests from this IP, please try again later"

    const auth = config.authentication ?? {}
    authProvider.value = auth.provider ?? "local"
    authDefaultRole.value = auth["default-role"] ?? ""
    oidcIssuer.value = auth.issuer ?? ""
    oidcClientId.value = auth["client-id"] ?? ""
    oidcClientSecret.value = auth["client-secret"] ?? ""
    oidcScope.value = auth.scope ?? ""
    oidcRolesPath.value = auth["roles-path"] ?? ""

    const cache = config.cache
    cacheProvider.value = cache?.provider ?? "postgres"
    cacheConfig.value = cache

    const ai = config["ai-engines"]
    aiEnginesUrl.value = ai?.["engines-url"] ?? ""
    aiEnginesTimeout.value = ai?.timeout ?? 30000
    aiEnginesSleep.value = ai?.sleep ?? 5000
    aiEnginesMinInstance.value = ai?.["min-instance"] ?? 1
    aiEnginesMaxInstance.value = ai?.["max-instance"] ?? 4
    aiEnginesCpuScaleUp.value = ai?.["cpu-scale-up"] ?? 70
    aiEnginesCpuScaleDown.value = ai?.["cpu-scale-down"] ?? 30
    aiEnginesScaleInterval.value = ai?.["scale-interval"] ?? 30000
    aiEnginesScaleDownGracePeriod.value = ai?.["scale-down-grace-period"] ?? 30000
    aiEnginesCpu.value = ai?.cpu ?? 2
    aiEnginesMemory.value = ai?.memory ?? 4
    aiEnginesBuildBatchSize.value = ai?.["build-batch-size"] ?? 3
    aiEnginesCorsOrigins.value = ai?.cors?.["allowed-origins"] ?? "*"
    aiEnginesCorsMethods.value = ai?.cors?.["allowed-methods"] ?? "GET,POST,PUT,DELETE"
    aiEnginesCorsHeaders.value = ai?.cors?.["allowed-headers"] ?? "Content-Type,Authorization"
  } catch {
    toast.add({ title: "Failed to load server config", color: "error" })
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const body: Record<string, any> = {
      port: port.value,
      timezone: timezone.value,
      verbosity: verbosity.value,
      "request-limit": requestLimit.value,
      "response-limit": responseLimit.value,
      "response-chunk": responseChunk.value,
      "response-compression": responseCompression.value,
      "response-rate": {
        windowMs: rateWindowMs.value,
        max: rateMax.value,
        message: rateMessage.value,
      },
      authentication: {
        provider: authProvider.value,
        "default-role": authDefaultRole.value,
        ...(authProvider.value === "oidc" ? {
          issuer: oidcIssuer.value,
          "client-id": oidcClientId.value,
          "client-secret": oidcClientSecret.value,
          scope: oidcScope.value,
          "roles-path": oidcRolesPath.value,
        } : {}),
      },
      cache: cacheFieldsRef.value?.collectBody?.() ?? { provider: cacheProvider.value },
      "ai-engines": {
        "engines-url": aiEnginesUrl.value,
        timeout: aiEnginesTimeout.value,
        sleep: aiEnginesSleep.value,
        "build-batch-size": aiEnginesBuildBatchSize.value,
        "min-instance": aiEnginesMinInstance.value,
        "max-instance": aiEnginesMaxInstance.value,
        "cpu-scale-up": aiEnginesCpuScaleUp.value,
        "cpu-scale-down": aiEnginesCpuScaleDown.value,
        "scale-interval": aiEnginesScaleInterval.value,
        "scale-down-grace-period": aiEnginesScaleDownGracePeriod.value,
        cpu: aiEnginesCpu.value,
        memory: aiEnginesMemory.value,
        cors: {
          "allowed-origins": aiEnginesCorsOrigins.value,
          "allowed-methods": aiEnginesCorsMethods.value,
          "allowed-headers": aiEnginesCorsHeaders.value,
        },
      },
    }

    await $fetch("/server-api/api/config/server", { method: "PATCH", body })
    await $fetch("/server-api/api/config/reload", { method: "POST" })

    toast.add({ title: "Server config saved", color: "success" })
  } catch {
    toast.add({ title: "Failed to save server config", color: "error" })
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader icon="i-lucide-sliders-horizontal" title="Server Configuration"
      description="Configure server settings from metal.yaml">
      <template #actions>
        <UButton icon="i-lucide-rotate-cw" label="Reload" size="sm" variant="outline" :loading="loading"
          @click="loadConfig" />
        <UButton icon="i-lucide-save" label="Save" size="sm" :loading="saving" @click="saveConfig" />
      </template>
    </PageHeader>

    <UCard v-if="loading" class="bg-metal-gradient">
      <div class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>
    </UCard>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- General -->
        <UCard class="bg-metal-gradient">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-server" class="size-5 text-primary" />
              <h2 class="font-semibold text-sm">General</h2>
            </div>
          </template>
          <div class="flex flex-col gap-4">
            <UFormField label="Port" description="Server TCP port (1-65535)" size="md" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="port" type="number" :min="1" :max="65535" class="w-24" />
            </UFormField>
            <UFormField label="Timezone" description="Default timezone for schedules" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="timezone" placeholder="UTC" class="w-24" />
            </UFormField>
            <UFormField label="Verbosity" description="Console logging level" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <USelect v-model="verbosity" :items="verbosityItems" class="w-24" />
            </UFormField>
            <UFormField label="Request Limit" description="Max request body size (e.g. 10mb)" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="requestLimit" placeholder="10mb" class="w-24" />
            </UFormField>
            <UFormField label="Response Limit" description="Max response body size (e.g. 10mb)" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="responseLimit" placeholder="10mb" class="w-24" />
            </UFormField>
            <UFormField label="Response Chunk" description="Enable chunked transfer encoding" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <USwitch v-model="responseChunk" />
            </UFormField>
            <UFormField label="Response Compression"
              description="Compress responses (gzip/brotli) based on client Accept-Encoding" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <USwitch v-model="responseCompression" />
            </UFormField>
          </div>
        </UCard>

        <!-- Authentication -->
        <UCard class="bg-metal-gradient">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield" class="size-5 text-success" />
              <h2 class="font-semibold text-sm">Authentication</h2>
            </div>
          </template>
          <div class="flex flex-col gap-4">
            <UFormField label="Provider" description="Authentication provider type" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <USelect v-model="authProvider" :items="authProviderItems" class="w-24" />
            </UFormField>
            <UFormField label="Default Role" description="Role assigned to authenticated users" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="authDefaultRole" placeholder="e.g. user" class="w-24" />
            </UFormField>
            <template v-if="authProvider === 'oidc'">
              <USeparator label="OIDC Settings" />
              <UFormField label="Issuer" description="OpenID Connect issuer URL" orientation="horizontal"
                :ui="{ description: 'text-xs' }">
                <UInput v-model="oidcIssuer" placeholder="https://accounts.google.com" />
              </UFormField>
              <UFormField label="Client ID" description="OAuth2 client ID" orientation="horizontal"
                :ui="{ description: 'text-xs' }">
                <UInput v-model="oidcClientId" placeholder="client-id" />
              </UFormField>
              <UFormField label="Client Secret" description="OAuth2 client secret" orientation="horizontal"
                :ui="{ description: 'text-xs' }">
                <UInput v-model="oidcClientSecret" type="password" placeholder="client-secret" />
              </UFormField>
              <UFormField label="Scope" description="Space-separated scopes (optional)" orientation="horizontal"
                :ui="{ description: 'text-xs' }">
                <UInput v-model="oidcScope" placeholder="openid profile email" />
              </UFormField>
              <UFormField label="Roles Path" description="JSON path to roles in token (optional)"
                orientation="horizontal" :ui="{ description: 'text-xs' }">
                <UInput v-model="oidcRolesPath" placeholder="e.g. resource_access.myapp.roles" />
              </UFormField>
            </template>
          </div>
        </UCard>

        <!-- Rate Limiting -->
        <UCard class="bg-metal-gradient">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-gauge" class="size-5 text-warning" />
              <h2 class="font-semibold text-sm">Rate Limiting</h2>
            </div>
          </template>
          <div class="flex flex-col gap-4">
            <UFormField label="Window (ms)" description="Time window in milliseconds" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="rateWindowMs" type="number" class="w-24" />
            </UFormField>
            <UFormField label="Max Requests" description="Max requests per window" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="rateMax" type="number" class="w-24" />
            </UFormField>
            <UFormField label="Message" description="Response when rate limit exceeded" orientation="horizontal"
              :ui="{ description: 'text-xs' }">
              <UInput v-model="rateMessage" class="w-80" />
            </UFormField>
          </div>
        </UCard>

        <!-- Cache -->
        <UCard class="bg-metal-gradient">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-database" class="size-5 text-info" />
              <h2 class="font-semibold text-sm">Cache</h2>
            </div>
          </template>
          <div class="flex flex-col gap-4">
            <SourceConfigFields ref="cacheFieldsRef" v-model:provider="cacheProvider" :source-config="cacheConfig"
              :providers="cacheProviders" />
          </div>
        </UCard>

        <!-- AI Engines -->
        <UCard class="bg-metal-gradient lg:col-span-2">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-brain" class="size-5 text-error" />
              <h2 class="font-semibold text-sm">AI Engines</h2>
            </div>
          </template>
          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="flex flex-col gap-4">
                <USeparator label="Endpoint" />
                <UFormField label="Engines URL" description="Base URL for AI engine service" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesUrl" placeholder="http://localhost:8080" />
                </UFormField>
                <UFormField label="Timeout (ms)" description="Request timeout" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesTimeout" type="number" class="w-24" />
                </UFormField>
                <UFormField label="Sleep (ms)" description="Sleep between health checks (5000-600000)"
                  orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesSleep" type="number" class="w-24" />
                </UFormField>
                <UFormField label="Build Batch Size" description="Tasks per build batch (1-10)" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesBuildBatchSize" type="number" :min="1" :max="10" class="w-24" />
                </UFormField>
              </div>
              <div class="flex flex-col gap-4">
                <USeparator label="CORS" />
                <UFormField label="Allowed Origins" description="Comma-separated origins" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCorsOrigins" placeholder="*" />
                </UFormField>
                <UFormField label="Allowed Methods" description="Comma-separated HTTP methods" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCorsMethods" placeholder="GET,POST,PUT,DELETE" />
                </UFormField>
                <UFormField label="Allowed Headers" description="Comma-separated headers" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCorsHeaders" placeholder="Content-Type,Authorization" />
                </UFormField>
              </div>
              <div class="flex flex-col gap-4">
                <USeparator label="Orchestrator" />
                <UFormField label="Min Instances" description="Minimum running instances" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesMinInstance" type="number" :min="1" class="w-24" />
                </UFormField>
                <UFormField label="Max Instances" description="Maximum running instances" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesMaxInstance" type="number" class="w-24" />
                </UFormField>
                <UFormField label="CPU Scale Up (%)" description="CPU threshold to scale up (10-100)"
                  orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCpuScaleUp" type="number" :min="10" :max="100" class="w-24" />
                </UFormField>
                <UFormField label="CPU Scale Down (%)" description="CPU threshold to scale down (0-50)"
                  orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCpuScaleDown" type="number" :min="0" :max="50" class="w-24" />
                </UFormField>
                <UFormField label="Scale Interval (ms)" description="Check interval (5000-600000)"
                  orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesScaleInterval" type="number" class="w-24" />
                </UFormField>
                <UFormField label="Scale Down Grace (ms)" description="Grace period before scaling down (5000-600000)"
                  orientation="horizontal" :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesScaleDownGracePeriod" type="number" class="w-24" />
                </UFormField>
              </div>
              <div class="flex flex-col gap-4">
                <USeparator label="Instance Resources" />
                <UFormField label="CPU (cores)" description="CPU cores per instance (1-64)" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesCpu" type="number" :min="1" :max="64"  class="w-24" />
                </UFormField>
                <UFormField label="Memory (GB)" description="Memory per instance (1-128)" orientation="horizontal"
                  :ui="{ description: 'text-xs' }">
                  <UInput v-model="aiEnginesMemory" type="number" :min="1" :max="128"  class="w-24" />
                </UFormField>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>