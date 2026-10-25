/**
 * 与 Agent 对话的接口占位。
 *
 * **本文件不发任何请求**：会话与消息都放在内存里（刷新即清空），只定契约 + 提供演示回复。
 * 接入后端时把下面几个函数换成通信层调用即可，视图层一行都不用改。
 *
 * 契约（地址由设置 → 网络里的 `config.apiBaseUrl` 提供，留空 = 与站点同源）：
 *
 * | 方法   | 路径                                  | 说明                                       |
 * | ------ | ------------------------------------- | ------------------------------------------ |
 * | `GET`  | `/agent/sessions`                     | 历史会话列表（按 `updatedAt` 倒序）        |
 * | `POST` | `/agent/sessions`                     | 新建会话，返回会话对象                     |
 * | `GET`  | `/agent/sessions/:id/messages`        | 某个会话的消息记录                         |
 * | `POST` | `/agent/messages`                     | 发送消息，body `{ sessionId, content }`；响应形式（一次性 / SSE 流式）待定 |
 *
 * ⚠️ **Agent 会话和 `chat` 栏目的会话是两套数据**：`chat.ts` 的 `ChatConversation`
 * 面向人与人 / 群聊，这里面向「与助手一问一答」，标题、历史、消息流各自独立。
 */

import { ref } from 'vue'

import type { ChatMessage } from './chat'

/** 一次与 Agent 的对话（历史列表里的一项）。 */
export interface AgentSession {
  /** 会话 id，也是消息里的 `conversationId`。 */
  id: string
  /** 会话标题：取首条用户消息截断；空串表示「新对话」。 */
  title: string
  /** 最后一条消息的时间，ISO 字符串。 */
  updatedAt: string
  /** 消息记录；新建的会话是空数组。 */
  messages: ChatMessage[]
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
 * ⚠️ 刷新页面会重置 —— 接入后端后由 `GET /agent/sessions` 恢复。
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
 * 演示回复（**占位**）。
 *
 * 接入后改成 `postJson<...>('/agent/messages', { sessionId, content })`，
 * 若是流式则换成 SSE / `fetch` + `ReadableStream`。
 */
export async function requestAgentReply(content: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 700))

  return `Agent 接口尚未接入，这条回复是前端本地生成的演示内容。\n\n你刚才说的是「${content}」。`
}
