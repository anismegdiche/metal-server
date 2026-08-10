<script setup lang="ts">
definePageMeta({ layout: false })

const { fetch: fetchSession } = useUserSession()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter your username and password'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/login', { method: 'POST', body: { username: username.value, password: password.value } })
    await fetchSession()
    await navigateTo('/dashboard')
  } catch (e: any) {
    errorMessage.value = e?.data?.message ?? e?.data?.error ?? 'Login failed. Check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 metal-bg-page">
    <UCard class="w-full max-w-sm shadow-2xl">
      <template #header>
        <div class="flex flex-col items-center gap-2">
          <img src="https://metal-docs-sh3b0.kinsta.page/metal-logo-icon.png" alt="Metal Logo" class="w-12 h-12" />
          <h1 class="text-xl font-bold tracking-tight">Metal<span class="font-extralight">studio</span></h1>
        </div>
      </template>

      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UFormField label="Username">
          <UInput v-model="username" icon="i-lucide-user" autocomplete="username" placeholder="username"
            class="w-full" />
        </UFormField>

        <UFormField label="Password">
          <UInput v-model="password" type="password" icon="i-lucide-lock" autocomplete="current-password"
            placeholder="password" class="w-full" />
        </UFormField>

        <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" icon="i-lucide-triangle-alert" />

        <UButton type="submit" :loading="loading" class="w-full" color="primary" block>
          Sign in
        </UButton>
      </form>
    </UCard>
  </div>
</template>
