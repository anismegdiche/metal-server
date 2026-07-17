<script setup lang="ts">
const { data: serverInfo, refresh } = useFetch<Record<string, any>>('/server-api/server/info')

onMounted(() => {
  const interval = setInterval(refresh, 10000)
  onUnmounted(() => clearInterval(interval))
})

const port = ref(3000)
const timezone = ref('UTC')
const verbosity = ref('warn')
const requestLimit = ref('10mb')
const responseLimit = ref('10mb')

const rateWindowMs = ref(60000)
const rateMax = ref(600)
const rateMessage = ref('Too many requests from this IP, please try again later')

const authProvider = ref('local')
const authDefaultRole = ref('')
const authAutocreate = ref(false)

const verbosityItems = [
  { label: 'trace', value: 'trace' },
  { label: 'debug', value: 'debug' },
  { label: 'info', value: 'info' },
  { label: 'warn', value: 'warn' },
  { label: 'error', value: 'error' },
]

const authProviderItems = [
  { label: 'local', value: 'local' },
  { label: 'oidc', value: 'oidc' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold"><UIcon name="i-lucide-sliders-horizontal" class="ml-0 mr-2" />Server</h1>
        <p class="text-sm text-muted">Configure server settings</p>
      </div>
      <UButton icon="i-lucide-save" label="Save" size="sm" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-server" class="size-4 text-primary" />
            <h2 class="font-semibold text-sm">General</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Port" hint="Server TCP port">
            <UInput v-model="port" type="number" />
          </UFormField>
          <UFormField label="Timezone" hint="Server timezone">
            <UInput v-model="timezone" />
          </UFormField>
          <UFormField label="Verbosity" hint="Console logging level">
            <USelect v-model="verbosity" :items="verbosityItems" />
          </UFormField>
          <UFormField label="Request Limit" hint="Max request body size">
            <UInput v-model="requestLimit" />
          </UFormField>
          <UFormField label="Response Limit" hint="Max response body size">
            <UInput v-model="responseLimit" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="size-4 text-success" />
            <h2 class="font-semibold text-sm">Authentication</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Provider" hint="Authentication provider type">
            <USelect v-model="authProvider" :items="authProviderItems" />
          </UFormField>
          <UFormField label="Default Role" hint="Role assigned to authenticated users">
            <UInput v-model="authDefaultRole" placeholder="e.g. user" />
          </UFormField>
          <UFormField label="Auto-create Users" hint="Auto-create user on first login">
            <UToggle v-model="authAutocreate" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-gauge" class="size-4 text-warning" />
            <h2 class="font-semibold text-sm">Rate Limiting</h2>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Window (ms)" hint="Time window in milliseconds">
            <UInput v-model="rateWindowMs" type="number" />
          </UFormField>
          <UFormField label="Max Requests" hint="Max requests per window">
            <UInput v-model="rateMax" type="number" />
          </UFormField>
          <UFormField label="Message" hint="Message when rate limit exceeded">
            <UInput v-model="rateMessage" />
          </UFormField>
        </div>
      </UCard>
    </div>
  </div>
</template>
