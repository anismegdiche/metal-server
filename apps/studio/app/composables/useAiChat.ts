export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    name: string
    args: unknown
    result: string
    duration: number
  }>
  timestamp: number
}

export type ConversationListItem = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export type ConversationDetail = {
  id: string
  title: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content?: string
    tool_calls?: unknown[]
    tool_call_id?: string
    name?: string
  }>
  createdAt: number
  updatedAt: number
}

export type ChatApiResponse = {
  conversationId: string
  reply: string
  toolCalls: Array<{
    name: string
    args: unknown
    result: string
    duration: number
  }>
}

export type HealthApiResponse = {
  status: string
  mcpConnected: boolean
  toolsCount: number
  conversations: number
}

const conversations = ref<ConversationListItem[]>([])
const activeConversationId = ref<string | null>(null)
const activeMessages = ref<ChatMessage[]>([])
const isLoading = ref(false)
const isStreaming = ref(false)
const streamingContent = ref('')
const streamingToolCalls = ref<ChatMessage['toolCalls']>([])
const isListing = ref(false)
const error = ref<string | null>(null)

function mapServerMessage(m: ConversationDetail['messages'][0]): ChatMessage | null {
  if (m.role === 'system' || m.role === 'tool') return null
  return {
    role: m.role as 'user' | 'assistant',
    content: m.content ?? '',
    toolCalls: m.tool_calls as ChatMessage['toolCalls'],
    timestamp: Date.now(),
  }
}

export function useAiChat() {
  const activeConversation = computed(() => {
    if (!activeConversationId.value) return null
    const meta = conversations.value.find(c => c.id === activeConversationId.value)
    if (!meta) return null
    return {
      ...meta,
      messages: activeMessages.value,
    }
  })

  async function fetchConversations() {
    if (import.meta.server) return
    isListing.value = true
    try {
      conversations.value = await $fetch<ConversationListItem[]>('/ai-api/conversations')
    } catch {
      conversations.value = []
    } finally {
      isListing.value = false
    }
  }

  async function fetchConversation(id: string) {
    if (import.meta.server) return
    try {
      const detail = await $fetch<ConversationDetail>(`/ai-api/conversations/${id}`)
      activeMessages.value = detail.messages
        .map(mapServerMessage)
        .filter((m): m is ChatMessage => m !== null)
    } catch {
      activeMessages.value = []
    }
  }

  function newConversation() {
    activeConversationId.value = null
    activeMessages.value = []
    error.value = null
  }

  async function selectConversation(id: string) {
    activeConversationId.value = id
    error.value = null
    await fetchConversation(id)
  }

  async function deleteConversation(id: string) {
    try {
      await $fetch(`/ai-api/conversations/${id}`, { method: 'DELETE' })
    } catch { /* best-effort */ }
    if (activeConversationId.value === id) {
      activeConversationId.value = null
      activeMessages.value = []
    }
    await fetchConversations()
  }

  async function sendMessage(message: string): Promise<boolean> {
    isLoading.value = true
    isStreaming.value = true
    streamingContent.value = ''
    streamingToolCalls.value = []
    error.value = null

    const conversationId = activeConversationId.value
    activeMessages.value.push({ role: 'user', content: message, timestamp: Date.now() })

    try {
      const res = await fetch('/ai-api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId: conversationId ?? undefined }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let finalReply = ''
      let finalToolCalls: ChatMessage['toolCalls'] = []
      let newConversationId = conversationId
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7)
            continue
          }

          if (!trimmed.startsWith('data: ')) continue

          const dataStr = trimmed.slice(6)
          let data: Record<string, unknown>
          try {
            data = JSON.parse(dataStr)
          } catch {
            currentEvent = ''
            continue
          }

          const eventType = currentEvent || (data.type as string)
          currentEvent = ''

          if (eventType === 'start') {
            newConversationId = data.conversationId as string
          } else if (eventType === 'token') {
            streamingContent.value += (data.content as string) ?? ''
          } else if (eventType === 'tool_call') {
            streamingToolCalls.value = streamingToolCalls.value ?? []
            streamingToolCalls.value.push({
              name: data.name as string,
              args: data.args,
              result: 'Running…',
              duration: 0,
            })
          } else if (eventType === 'tool_result') {
            const tc = streamingToolCalls.value?.find(t => t.name === data.name)
            if (tc) {
              tc.result = data.result as string
              tc.duration = data.duration as number
            }
          } else if (eventType === 'done') {
            finalReply = data.reply as string
            finalToolCalls = data.toolCalls as ChatMessage['toolCalls']
          } else if (eventType === 'error') {
            throw new Error(data.message as string)
          }
        }
      }

      if (!newConversationId && conversationId) {
        newConversationId = conversationId
      }
      if (newConversationId && !conversationId) {
        activeConversationId.value = newConversationId
      }

      const content = finalReply || streamingContent.value
      const toolCalls = finalToolCalls?.length ? finalToolCalls : streamingToolCalls.value

      activeMessages.value.push({
        role: 'assistant',
        content,
        toolCalls: toolCalls?.length ? toolCalls : undefined,
        timestamp: Date.now(),
      })

      await fetchConversations()
      return true
    } catch (e: unknown) {
      activeMessages.value.push({
        role: 'assistant',
        content: `**Error:** ${e instanceof Error ? e.message : 'Request failed'}`,
        timestamp: Date.now(),
      })
      error.value = e instanceof Error ? e.message : 'Request failed'
      return false
    } finally {
      isLoading.value = false
      isStreaming.value = false
      streamingContent.value = ''
      streamingToolCalls.value = []
    }
  }

  async function checkHealth(): Promise<HealthApiResponse | null> {
    try {
      return await $fetch<HealthApiResponse>('/ai-api/health')
    } catch {
      return null
    }
  }

  return {
    conversations: readonly(conversations),
    activeConversationId: readonly(activeConversationId),
    activeConversation,
    isLoading: readonly(isLoading),
    isStreaming: readonly(isStreaming),
    streamingContent: readonly(streamingContent),
    streamingToolCalls: readonly(streamingToolCalls),
    isListing: readonly(isListing),
    error: readonly(error),
    fetchConversations,
    newConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    checkHealth,
  }
}
