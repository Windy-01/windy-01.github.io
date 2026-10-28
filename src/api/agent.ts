/**
 * 与 Agent 对话的接口。
 *
 * 会话与消息仍是**内存存储**（刷新即清空），但「发消息」已经真的打后端。
 *
 * | 方法   | 路径          | 说明                                          |
 * | ------ | ------------- | --------------------------------------------- |
 * | `POST` | `/agent/chat` | 发送一条消息，body `{ sessionId, message }`   |
 *
 * **地址从哪来**（`agentBackend()` 决定，顺序即优先级）：
 * 1. **Agent 专用地址** —— Agent 界面右上角设置里填的 `ip:port`（`config.agentApiBaseUrl`）；
 * 2. **全局 API Base URL** —— 没填专用地址时回落到它（`config.apiBaseUrl`）；
 * 3. 两者都空 → 不联网，回一条本地演示文案（纯静态部署时界面也能跑起来）。
 *
 * ⚠️ 路径里**不写 `/api`** —— 前缀由上面两处配置提供（与站内其它接口一致）。
 *
 * **响应是宽容解析的**（见 `extractReply()`）：`{ reply }` / `{ content }` / `{ message }` /
 * `{ answer }` / `{ text }` / `{ response }` / `{ output }` / `{ result }`、`{ data: { … } }`
 * 包一层、OpenAI 风格的 `{ choices: [{ message: { content } }] }`，以及**纯文本**都认。
 * 后端不必为了对接前端改字段名。
 *
 * 未实现（等后端定了再补）：`GET /agent/sessions`、`GET /agent/sessions/:id/messages`、
 * `DELETE /agent/sessions/:id`。历史目前只活在内存里。
 */

import { ref } from 'vue'

import { normalizeAgentBaseUrl, normalizeApiBaseUrl, useConfig } from '../config'
import { ApiError, postJson } from './http'
import type { ChatMessage } from './chat'

/** 发消息的接口路径；前缀由 `agentBackend()` 提供。 */
export const agentChatPath = '/agent/chat'

/** 一次与 Agent 的对话（历史列表里的一项）。 */
export interface AgentSession {
  /** 会话 id，也是消息里的 `conversationId`；会随每条消息发给后端做上下文串联。 */
  id: string
  /** 会话标题：取首条用户消息截断；空串表示「新对话」。 */
  title: string
  /** 最后一条消息的时间，ISO 字符串。 */
  updatedAt: string
  /** 消息记录；新建的会话是空数组。 */
  messages: ChatMessage[]
}

/** 发送一条消息的参数。 */
export interface AgentChatPayload {
  sessionId: string
  content: string
}

/** 当前生效的 Agent 后端。 */
export interface AgentBackend {
  /** 规范化后的前缀；`''` 表示没有任何后端可用（走本地演示）。 */
  base: string
  /** 地址来源：专用地址 / 全局 API Base URL / 无。 */
  source: 'custom' | 'global' | 'none'
  /** 可直接展示、也能直接复制去调试的完整接口地址；无后端时为空串。 */
  chatUrl: string
}

/** 空态下展示的示例提示词，点一下填进输入框（不直接发送）。 */
export const agentSuggestions: string[] = [
  '帮我把这段话改得更简洁',
  '解释一下这段代码在做什么',
  '给这个功能起几个名字',
  '列一份这周的待办清单',
]

let sequence = 0

/** 造一个空会话。id 用时间戳 + 自增，避免同一毫秒内重复。 */
export function createAgentSession(): AgentSession {
  sequence += 1

  return {
    id: `agent-${Date.now().toString(36)}-${sequence}`,
    title: '',
    updatedAt: new Date().toISOString(),
    messages: [],
  }
}

/**
 * 会话列表（内存存储）。
 *
 * ⚠️ 放在模块作用域而不是组件里：切到别的标签时 `ChatAgent` 会卸载，
 * 状态跟着组件走就丢了；放这里才能「切回来还是刚才那些对话」。
 * ⚠️ 刷新页面会重置 —— 接入 `GET /agent/sessions` 后由后端恢复。
 */
const firstSession = createAgentSession()
export const agentSessions = ref<AgentSession[]>([firstSession])

/** 当前打开的会话 id。 */
export const activeAgentSessionId = ref(firstSession.id)

/** 把一条用户消息压成标题（单行、截断），避免列表里换行或过长。 */
export function titleFromContent(content: string): string {
  const single = content.replace(/\s+/g, ' ').trim()

  return single.length > 18 ? `${single.slice(0, 18)}…` : single
}

/**
 * 当前该往哪儿发消息。
 *
 * 读的是响应式 `config`，所以在 `computed()` 里调用会跟着设置面板的保存自动更新。
 */
export function agentBackend(): AgentBackend {
  const { config } = useConfig()
  const custom = normalizeAgentBaseUrl(config.agentApiBaseUrl)

  if (custom !== '') {
    return { base: custom, source: 'custom', chatUrl: `${custom}${agentChatPath}` }
  }

  const global = normalizeApiBaseUrl(config.apiBaseUrl)

  if (global !== '') {
    return { base: global, source: 'global', chatUrl: `${global}${agentChatPath}` }
  }

  return { base: '', source: 'none', chatUrl: '' }
}

/** 响应里可能装回复内容的键，按优先级尝试（后端用哪个都能接上）。 */
const replyKeys = ['reply', 'content', 'answer', 'text', 'response', 'output', 'result', 'message']

/** 只认非空字符串；其余（数字 / 对象 / 空串）都当「没有」。 */
function readReplyText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 从响应体里抽出一条回复文本；抽不到返回空串。
 *
 * `depth` 只用来限制递归层数（`{ data: { … } }` 与 OpenAI 的 `choices[0].message`），
 * 避免异常结构把解析带进死循环。
 */
function extractReply(raw: unknown, depth = 0): string {
  // 后端直接回一段纯文本
  if (typeof raw === 'string') {
    return raw.trim()
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return ''
  }

  const record = raw as Record<string, unknown>

  for (const key of replyKeys) {
    const hit = readReplyText(record[key])

    if (hit !== '') {
      return hit
    }
  }

  if (depth >= 2) {
    return ''
  }

  // OpenAI 风格：choices[0].message.content / choices[0].text
  const choices = record.choices

  if (Array.isArray(choices) && choices.length > 0) {
    const first: unknown = choices[0]

    if (typeof first === 'object' && first !== null) {
      const choice = first as Record<string, unknown>
      const fromMessage = extractReply(choice.message, depth + 1)

      if (fromMessage !== '') {
        return fromMessage
      }

      const fromText = readReplyText(choice.text)

      if (fromText !== '') {
        return fromText
      }
    }
  }

  // 统一包了一层的响应：{ data: { reply: … } }
  return extractReply(record.data, depth + 1)
}

/** 把通信层的错误翻成一句能直接展示给用户的话。 */
function toFriendlyError(cause: unknown, backend: AgentBackend): Error {
  if (cause instanceof ApiError) {
    if (cause.status === 0) {
      return new Error(
        `无法连接到 Agent 后端 ${backend.chatUrl}。请确认地址填对了、服务已启动，且允许跨域（CORS）。`,
      )
    }

    return new Error(`Agent 后端返回 ${cause.status}：${cause.message}`)
  }

  return cause instanceof Error ? cause : new Error('Agent 请求失败。')
}

/** 没有任何后端时的本地演示回复（明确标注，别让人以为真连上了）。 */
function demoReply(content: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        `还没有配置 Agent 后端，这条是前端本地生成的演示回复。\n\n`
        + `在右上角的设置里填上 ip:port（例如 127.0.0.1:8000）就能连上真实后端。\n\n`
        + `你刚才说的是「${content}」。`,
      )
    }, 500)
  })
}

/**
 * 发一条消息，拿回 Agent 的回复。
 *
 * 失败时抛 `Error`，`message` 已经是可直接展示的文案（含状态码 / 地址）。
 */
export async function requestAgentReply(payload: AgentChatPayload): Promise<string> {
  const backend = agentBackend()

  // 没有任何后端：保持界面可用，回演示文案。
  if (backend.base === '') {
    return demoReply(payload.content)
  }

  let raw: unknown

  try {
    raw = await postJson<unknown>(
      agentChatPath,
      { sessionId: payload.sessionId, message: payload.content },
      {
        baseUrl: backend.base,
        // 专用地址是用户自己的服务，不该收到站内的登录令牌；
        // 回落到全局 API Base URL 时那是同一个后端，照常带令牌。
        auth: backend.source !== 'custom',
      },
    )
  } catch (cause) {
    throw toFriendlyError(cause, backend)
  }

  const reply = extractReply(raw)

  if (reply === '') {
    throw new Error('后端响应里没有可识别的回复内容（期望形如 {"reply": "…"}）。')
  }

  return reply
}
