<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6">
    <div class="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
      <h1 class="text-3xl font-semibold mb-4">Metal AI Chat Example</h1>
      <p class="mb-6 text-slate-400">A standalone Nuxt 4 example that connects to a Metal AI server via MCP-style tool calls.</p>
      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <label class="block text-sm font-medium text-slate-300 mb-2">Message</label>
          <textarea v-model="message" rows="4" class="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-100 resize-none" placeholder="Ask something..."></textarea>
        </div>
        <button class="rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400" @click="sendMessage">Send</button>
      </div>
      <div v-if="error" class="mt-4 rounded-2xl border border-red-500 bg-red-950/70 p-4 text-sm text-red-200">
        {{ error }}
      </div>
      <div v-if="reply" class="mt-4 rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
        <h2 class="text-lg font-semibold mb-2">Reply</h2>
        <p class="whitespace-pre-wrap">{{ reply }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref('')
const reply = ref('')
const error = ref('')

async function sendMessage() {
  error.value = ''
  reply.value = ''
  if (!message.value.trim()) {
    error.value = 'Please type a message.'
    return
  }

  try {
    const res = await $fetch('/ai-api/chat/stream', {
      method: 'POST',
      body: { message: message.value },
    })
    reply.value = JSON.stringify(res, null, 2)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Request failed'
  }
}
</script>
