<script setup lang="ts">
import type { ConversationListItem } from '../../composables/useAiChat'

const {
  conversations,
  activeConversationId,
  activeConversation,
  isLoading,
  isStreaming,
  streamingContent,
  streamingToolCalls,
  error,
  fetchConversations,
  newConversation,
  selectConversation,
  deleteConversation,
  sendMessage,
  checkHealth
} = useAiChat()

const inputText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const serverOnline = ref<boolean | null>(null)
const expandedToolCalls = ref<Set<number>>(new Set())

const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) => b.updatedAt - a.updatedAt)
)

function getTitle(conv: ConversationListItem): string {
  return conv.title || 'New conversation'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleSend() {
  const msg = inputText.value.trim()
  if (!msg || isLoading.value) return
  inputText.value = ''
  await sendMessage(msg)
  nextTick(scrollToBottom)
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(activeConversationId, () => {
  nextTick(scrollToBottom)
})

watch(() => activeConversation.value?.messages.length, () => {
  nextTick(scrollToBottom)
})

onMounted(async () => {
  serverOnline.value = (await checkHealth()) !== null
  await fetchConversations()
})

function renderMarkdown(text: string): string {
  if (!text) return ''

  let html = text

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<pre class="rounded bg-background p-3 text-xs overflow-x-auto my-2"><code class="language-${lang}">${escaped}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="rounded bg-background px-1.5 py-0.5 text-xs">$1</code>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, header: string, _sep: string, body: string) => {
    const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th class="px-2 py-1 text-left font-medium border-b border-default">${c.trim()}</th>`)
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td class="px-2 py-1 border-b border-default">${c.trim()}</td>`)
      return `<tr>${cells.join('')}</tr>`
    })
    return `<div class="overflow-x-auto my-2"><table class="text-xs border border-default rounded">${headers.length ? `<thead><tr>${headers.join('')}</tr></thead>` : ''}<tbody>${rows.join('')}</tbody></table></div>`
  })

  // Unordered lists
  html = html.replace(/(?:^|\n)((?:- .+\n?)+)/g, (_: string, block: string) => {
    const items = block.trim().split('\n').map((line: string) => `<li class="ml-4">${line.replace(/^- /, '')}</li>`)
    return `<ul class="list-disc my-1">${items.join('')}</ul>`
  })

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-3 mb-1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-semibold mt-3 mb-1">$1</h1>')

  // Line breaks
  html = html.replace(/\n/g, '<br>')

  return html
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function truncateResult(result: string): string {
  if (result.length > 300) return `${result.slice(0, 300)}…`
  return result
}

function toggleToolCalls(msgIndex: number) {
  const s = new Set(expandedToolCalls.value)
  if (s.has(msgIndex)) {
    s.delete(msgIndex)
  } else {
    s.add(msgIndex)
  }
  expandedToolCalls.value = s
}
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] gap-0 -m-4 overflow-hidden">
    <!-- Left pane: conversation list -->
    <div class="w-72 shrink-0 border-r border-default flex flex-col bg-default">
      <div class="p-3 border-b border-default flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-bot"
            class="size-5 text-primary"
          />
          <span class="font-semibold text-sm">Conversations</span>
        </div>
        <UButton
          icon="i-lucide-plus"
          size="xs"
          variant="outline"
          label="New"
          @click="newConversation"
        />
      </div>

      <div class="flex-1 overflow-y-auto">
        <div
          v-if="sortedConversations.length === 0"
          class="p-4 text-center text-sm text-muted"
        >
          No conversations yet
        </div>
        <button
          v-for="conv in sortedConversations"
          :key="conv.id"
          class="w-full text-left px-3 py-2.5 border-b border-default hover:bg-elevated transition-colors cursor-pointer"
          :class="{ 'bg-elevated/50': activeConversationId === conv.id }"
          @click="selectConversation(conv.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">
                {{ getTitle(conv) }}
              </p>
              <p class="text-xs text-muted mt-0.5">
                {{ formatTime(conv.updatedAt) }}
              </p>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              class="shrink-0 opacity-0 group-hover:opacity-100"
              @click.stop="deleteConversation(conv.id)"
            />
          </div>
        </button>
      </div>

      <!-- Health indicator -->
      <div class="p-2 border-t border-default flex items-center gap-2 text-xs text-muted">
        <span
          class="size-2 rounded-full"
          :class="serverOnline === null ? 'bg-neutral' : serverOnline ? 'bg-success' : 'bg-error'"
        />
        <span>{{ serverOnline === null ? 'Checking…' : serverOnline ? 'AI server online' : 'AI server offline' }}</span>
      </div>
    </div>

    <!-- Right pane: chat -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Empty state -->
      <div
        v-if="!activeConversation"
        class="flex-1 flex flex-col items-center justify-center text-center p-8"
      >
        <UIcon
          name="i-lucide-bot"
          class="size-16 text-muted/40 mb-4"
        />
        <h3 class="text-lg font-semibold mb-1">
          Metal AI Assistant
        </h3>
        <p class="text-sm text-muted max-w-md">
          Ask questions about your data sources, schemas, entities, and plans.
          The assistant uses tools to look up actual data.
        </p>
      </div>

      <!-- Messages (only when conversation active) -->
      <div
        v-else
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <div
          v-for="(msg, i) in activeConversation.messages"
          :key="i"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-lg px-4 py-2.5"
            :class="msg.role === 'user'
              ? 'bg-primary text-white'
              : 'bg-elevated border border-default'"
          >
            <!-- Assistant avatar + name -->
            <div
              v-if="msg.role === 'assistant'"
              class="flex items-center gap-1.5 mb-1.5"
            >
              <UIcon
                name="i-lucide-bot"
                class="size-3.5 text-primary"
              />
              <span class="text-xs font-medium text-primary">Assistant</span>
            </div>

            <!-- Message content (markdown for assistant) -->
            <div
              v-if="msg.role === 'assistant'"
              class="prose prose-sm dark:prose-invert max-w-none wrap-break-words"
              v-html="renderMarkdown(msg.content)"
            />

            <!-- Message content (plain for user) -->
            <div
              v-else
              class="text-sm whitespace-pre-wrap wrap-break-words"
            >
              {{ msg.content }}
            </div>

            <!-- Tool calls -->
            <div
              v-if="msg.toolCalls && msg.toolCalls.length > 0"
              class="mt-2 pt-2 border-t border-default/50"
            >
              <UButton
                icon="i-lucide-wrench"
                :label="`${msg.toolCalls.length} tool call${msg.toolCalls.length > 1 ? 's' : ''}`"
                variant="ghost"
                size="xs"
                :trailing-icon="expandedToolCalls.has(i) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="text-xs text-muted"
                :ui="{ label: 'text-xs' }"
                @click="toggleToolCalls(i)"
              />
              <div
                v-if="expandedToolCalls.has(i)"
                class="mt-1.5 space-y-1.5"
              >
                <div
                  v-for="(tc, j) in msg.toolCalls"
                  :key="j"
                  class="rounded bg-background p-2 text-xs"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-mono font-medium">{{ tc.name }}</span>
                    <span class="text-muted">{{ tc.duration }}ms</span>
                  </div>
                  <div class="text-muted font-mono text-[11px] leading-relaxed">
                    <div
                      v-if="tc.args"
                      class="mb-1"
                    >
                      <span class="text-muted/70">args:</span> {{ formatJson(tc.args) }}
                    </div>
                    <div>
                      <span class="text-muted/70">result:</span> {{ truncateResult(tc.result) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Streaming message -->
        <div
          v-if="isStreaming"
          class="flex justify-start"
        >
          <div class="max-w-[80%] bg-elevated border border-default rounded-lg px-4 py-2.5">
            <div class="flex items-center gap-1.5 mb-1.5">
              <UIcon
                name="i-lucide-bot"
                class="size-3.5 text-primary"
              />
              <span class="text-xs font-medium text-primary">Assistant</span>
              <span class="text-[10px] text-muted ml-1 animate-pulse">streaming…</span>
            </div>
            <div
              v-if="streamingContent"
              class="prose prose-sm dark:prose-invert max-w-none wrap-break-words"
              v-html="renderMarkdown(streamingContent)"
            />
            <div
              v-else
              class="flex items-center gap-1.5"
            >
              <span class="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
              <span class="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
              <span class="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
            </div>
            <div
              v-if="streamingToolCalls && streamingToolCalls.length > 0"
              class="mt-2 pt-2 border-t border-default/50 space-y-1.5"
            >
              <div
                v-for="(tc, j) in streamingToolCalls"
                :key="j"
                class="rounded bg-background p-2 text-xs"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-wrench" class="size-3 text-primary" />
                  <span class="font-mono font-medium">{{ tc.name }}</span>
                  <span
                    v-if="tc.result === 'Running…'"
                    class="text-muted animate-pulse"
                  >Running…</span>
                  <span
                    v-else
                    class="text-muted"
                  >{{ tc.duration }}ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error banner -->
        <div
          v-if="error && !isLoading"
          class="flex justify-center"
        >
          <div class="rounded-lg bg-error/10 border border-error/20 px-4 py-2 text-sm text-error">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Input (always visible) -->
      <div class="p-4 border-t border-default">
        <div class="flex items-end gap-2">
          <UTextarea
            v-model="inputText"
            :placeholder="activeConversation ? 'Ask about your data…' : 'Type your first message to start…'"
            :rows="1"
            autoresize
            :maxrows="5"
            :disabled="isLoading"
            class="flex-1"
            @keydown="handleKeydown"
          />
          <UButton
            icon="i-lucide-send"
            :disabled="!inputText.trim() || isLoading"
            :loading="isLoading"
            @click="handleSend"
          />
        </div>
        <p class="text-[11px] text-muted mt-1.5">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  </div>
</template>
