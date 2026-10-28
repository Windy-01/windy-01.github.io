/**
 * 聊天接口占位。
 *
 * **本文件目前不发任何请求，也不提供任何本地数据** —— 会话列表与消息记录都是空的，
 * 界面会显示各自的空态（「暂无会话」/「暂无群聊」）。
 *
 * 文件只做一件事：定好后端契约（路径 / 参数 / 返回），接入时把函数体换成通信层调用即可，
 * 调用方一行都不用改。
 *
 * 契约（地址由设置 → 网络里的 `config.apiBaseUrl` 提供，留空 = 与站点同源）：
 *
 * | 方法   | 路径                                    | 说明                                     |
 * | ------ | --------------------------------------- | ---------------------------------------- |
 * | `GET`  | `/chat/conversations`                   | 会话列表                                 |
 * | `GET`  | `/chat/conversations/:id/messages`      | 某个会话的消息记录                       |
 * | `POST` | `/chat/messages`                        | 发送消息，body `{ conversationId, content }` |
 *
 * 接入方式：把下面三个函数的函数体改成
 * `getJson<ChatConversation[]>('/chat/conversations')` 这类调用（见 `./http.ts`），
 * 视图层不需要任何改动。
 */

/**
 * 会话类型：单聊 / 群聊 / 系统通知。
 *
 * ⚠️ 「与 Agent 对话」**不在这里** —— 它是独立的一套数据（`src/api/agent.ts`），
 * 不参与这里的会话列表与排序。
 */
export type ChatConversationKind = 'direct' | 'group' | 'bot'

/** 一个会话（聊天列表里的一项）。 */
export interface ChatConversation {
  /** 会话 id，也是消息记录里的 `conversationId`。 */
  id: string
  /** 会话名称：单聊是对方名字，群聊是群名。 */
  name: string
  /** 头像地址；为空时界面用名称首字生成占位头像。 */
  avatar: string
  kind: ChatConversationKind
  /** 群聊成员数；非群聊为 0。 */
  memberCount: number
  /** 最后一条消息的摘要，列表里单行截断展示。 */
  lastMessage: string
  /** 最后一条消息的时间，ISO 字符串。 */
  updatedAt: string
  /** 未读数；0 表示没有未读。 */
  unread: number
}

/** 消息发送状态。 */
export type ChatMessageStatus = 'sending' | 'sent' | 'read' | 'failed'

/** 一条聊天记录。 */
export interface ChatMessage {
  id: string
  /** 所属会话 id。 */
  conversationId: string
  /** 发送者名称；自己发出的消息也带上（便于群聊里区分）。 */
  authorName: string
  /** 是否是自己发出的 —— 决定气泡在左还是在右。 */
  outgoing: boolean
  /** 消息正文，纯文本（保留换行）。 */
  content: string
  /** 发送时间，ISO 字符串。 */
  sentAt: string
  /** 发送状态，只对 `outgoing` 的消息有意义。 */
  status: ChatMessageStatus
}

/** 发送消息的参数（接口占位，暂未使用）。 */
export interface SendMessagePayload {
  conversationId: string
  content: string
}

/**
 * 拉取会话列表。
 *
 * 预留：接入后端后改为 `getJson<ChatConversation[]>('/chat/conversations')`。
 * 现在**返回空数组**（没有本地演示数据），列表会展示「暂无会话」空态。
 */
export async function fetchConversations(): Promise<ChatConversation[]> {
  return []
}

/**
 * 拉取某个会话的消息记录。
 *
 * 预留：接入后端后改为
 * `getJson<ChatMessage[]>(\`/chat/conversations/${encodeURIComponent(conversationId)}/messages\`)`。
 *
 * 现在**返回空数组**（没有本地演示数据），消息区会展示空态文案。
 * ⚠️ 不再抛「会话不存在」的错：本地没有数据源，抛错只会让空态变成红字报错。
 */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  void conversationId

  return []
}

/**
 * 发送消息（**占位，尚未接入**）。
 *
 * 预留：接入后端后改为
 * `postJson<void>('/chat/messages', payload)`。
 *
 * @throws 目前一律抛出，提醒调用方这条链路还没接。
 */
export async function sendMessage(payload: SendMessagePayload): Promise<void> {
  void payload
  throw new Error('发送消息接口尚未接入，当前只在本地演示。')
}
