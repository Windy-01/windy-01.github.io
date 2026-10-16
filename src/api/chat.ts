/**
 * 聊天接口占位。
 *
 * **本文件目前不发任何请求**，只做两件事：
 * 1. 定好后端契约（路径 / 参数 / 返回），接入时把函数体换成通信层调用即可，调用方一行都不用改；
 * 2. 提供一份**本地演示数据**，让 `chat` 栏目在没有后端时也能把界面效果跑起来。
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

/** 会话类型：单聊 / 群聊 / 系统通知。 */
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

const minute = 60 * 1000
const hour = 60 * minute
const day = 24 * hour

/**
 * 演示数据的时间基准。
 *
 * 刻意写成「相对当前时间」而不是固定日期，这样界面上的「刚刚 / 昨天 / 周一」永远是合理的，
 * 不会随着时间推移变成一堆几个月前的日期。
 */
const base = Date.now()
const ago = (offset: number): string => new Date(base - offset).toISOString()

/** 接入后端前的本地演示会话。 */
const demoConversations: ChatConversation[] = [
  {
    id: 'team-frontend',
    name: '前端小组',
    avatar: '',
    kind: 'group',
    memberCount: 6,
    lastMessage: '林清和：晚点把构建脚本也一起改了',
    updatedAt: ago(4 * minute),
    unread: 3,
  },
  {
    id: 'user-lin',
    name: '林清和',
    avatar: '',
    kind: 'direct',
    memberCount: 0,
    lastMessage: '那个 iframe 的参数我又试了一遍，还是会被拦',
    updatedAt: ago(48 * minute),
    unread: 1,
  },
  {
    id: 'user-zhou',
    name: '周樾',
    avatar: '',
    kind: 'direct',
    memberCount: 0,
    lastMessage: '好，我看看',
    updatedAt: ago(3 * hour),
    unread: 0,
  },
  {
    id: 'bot-build',
    name: '构建通知',
    avatar: '',
    kind: 'bot',
    memberCount: 0,
    lastMessage: 'main 分支构建成功，用时 1 分 12 秒',
    updatedAt: ago(21 * hour),
    unread: 0,
  },
  {
    id: 'user-su',
    name: '苏见月',
    avatar: '',
    kind: 'direct',
    memberCount: 0,
    lastMessage: '文档我放到 tmp 里了，你直接改就行',
    updatedAt: ago(2 * day),
    unread: 0,
  },
  {
    id: 'user-chen',
    name: '陈嘉木',
    avatar: '',
    kind: 'direct',
    memberCount: 0,
    lastMessage: '下周的分享要不就讲滚动条那个坑',
    updatedAt: ago(9 * day),
    unread: 0,
  },
]

/** 接入后端前的本地演示消息。 */
const demoMessages: Record<string, ChatMessage[]> = {
  'team-frontend': [
    {
      id: 'm-f-1',
      conversationId: 'team-frontend',
      authorName: '苏见月',
      outgoing: false,
      content: '这周的进度同步一下？我这边把文档栏目的路由改完了。',
      sentAt: ago(2 * day + 40 * minute),
      status: 'sent',
    },
    {
      id: 'm-f-2',
      conversationId: 'team-frontend',
      authorName: 'Windy',
      outgoing: true,
      content: '我这边在收尾鉴权，令牌已经能存下来了，请求头会自动带上。',
      sentAt: ago(2 * day + 34 * minute),
      status: 'read',
    },
    {
      id: 'm-f-3',
      conversationId: 'team-frontend',
      authorName: '林清和',
      outgoing: false,
      content: '注意一下跨域，带 Authorization 会触发预检，后端得放行这个头。',
      sentAt: ago(2 * day + 30 * minute),
      status: 'sent',
    },
    {
      id: 'm-f-4',
      conversationId: 'team-frontend',
      authorName: 'Windy',
      outgoing: true,
      content: '已经在 mock 上验证过了，预检和 401 分支都跑通了。',
      sentAt: ago(2 * day + 26 * minute),
      status: 'read',
    },
    {
      id: 'm-f-5',
      conversationId: 'team-frontend',
      authorName: '周樾',
      outgoing: false,
      content: '聊天这块的界面我先搭个架子，列表和消息区都做成独立组件。',
      sentAt: ago(30 * minute),
      status: 'sent',
    },
    {
      id: 'm-f-6',
      conversationId: 'team-frontend',
      authorName: '林清和',
      outgoing: false,
      content: '可以，宽度比例别写死，后面还要加成员面板。',
      sentAt: ago(12 * minute),
      status: 'sent',
    },
    {
      id: 'm-f-7',
      conversationId: 'team-frontend',
      authorName: '林清和',
      outgoing: false,
      content: '晚点把构建脚本也一起改了',
      sentAt: ago(4 * minute),
      status: 'sent',
    },
  ],
  'user-lin': [
    {
      id: 'm-l-1',
      conversationId: 'user-lin',
      authorName: 'Windy',
      outgoing: true,
      content: 'b 站那个嵌入播放器，你那边点进去会不会跳到视频主页？',
      sentAt: ago(3 * hour),
      status: 'read',
    },
    {
      id: 'm-l-2',
      conversationId: 'user-lin',
      authorName: '林清和',
      outgoing: false,
      content: '会。官方只公开了 13 个参数，没有隐藏推荐位的。',
      sentAt: ago(2 * hour + 50 * minute),
      status: 'sent',
    },
    {
      id: 'm-l-3',
      conversationId: 'user-lin',
      authorName: '林清和',
      outgoing: false,
      content: '要干净的话换成 html5mobileplayer 那个端点，没有标题栏也没有跳转按钮。',
      sentAt: ago(2 * hour + 48 * minute),
      status: 'sent',
    },
    {
      id: 'm-l-4',
      conversationId: 'user-lin',
      authorName: 'Windy',
      outgoing: true,
      content: '防跳转我是靠 sandbox 掐掉 allow-popups 的，先这么用着。',
      sentAt: ago(55 * minute),
      status: 'read',
    },
    {
      id: 'm-l-5',
      conversationId: 'user-lin',
      authorName: '林清和',
      outgoing: false,
      content: '那个 iframe 的参数我又试了一遍，还是会被拦',
      sentAt: ago(48 * minute),
      status: 'sent',
    },
  ],
  'user-zhou': [
    {
      id: 'm-z-1',
      conversationId: 'user-zhou',
      authorName: '周樾',
      outgoing: false,
      content: '侧栏那个 bug 复现了吗？',
      sentAt: ago(5 * hour),
      status: 'sent',
    },
    {
      id: 'm-z-2',
      conversationId: 'user-zhou',
      authorName: 'Windy',
      outgoing: true,
      content: '复现了。移动端强制展开那段逻辑写在了 resize 里，直接把状态改了，切回桌面就泄漏了。',
      sentAt: ago(4 * hour + 40 * minute),
      status: 'read',
    },
    {
      id: 'm-z-3',
      conversationId: 'user-zhou',
      authorName: 'Windy',
      outgoing: true,
      content: '现在改成派生值了，状态只由用户点击改写。',
      sentAt: ago(4 * hour + 38 * minute),
      status: 'read',
    },
    {
      id: 'm-z-4',
      conversationId: 'user-zhou',
      authorName: '周樾',
      outgoing: false,
      content: '好，我看看',
      sentAt: ago(3 * hour),
      status: 'sent',
    },
  ],
  'bot-build': [
    {
      id: 'm-b-1',
      conversationId: 'bot-build',
      authorName: '构建通知',
      outgoing: false,
      content: 'main 分支构建开始，提交 3f2c9a1。',
      sentAt: ago(21 * hour + 2 * minute),
      status: 'sent',
    },
    {
      id: 'm-b-2',
      conversationId: 'bot-build',
      authorName: '构建通知',
      outgoing: false,
      content: '类型检查通过。',
      sentAt: ago(21 * hour + 1 * minute),
      status: 'sent',
    },
    {
      id: 'm-b-3',
      conversationId: 'bot-build',
      authorName: '构建通知',
      outgoing: false,
      content: 'main 分支构建成功，用时 1 分 12 秒',
      sentAt: ago(21 * hour),
      status: 'sent',
    },
  ],
  'user-su': [
    {
      id: 'm-s-1',
      conversationId: 'user-su',
      authorName: '苏见月',
      outgoing: false,
      content: '用户主页的正文我按 profile README 的路子写了，表格和引用都放进去试了。',
      sentAt: ago(2 * day + 3 * hour),
      status: 'sent',
    },
    {
      id: 'm-s-2',
      conversationId: 'user-su',
      authorName: 'Windy',
      outgoing: true,
      content: '收到，我把卡片宽度又放宽了一档。',
      sentAt: ago(2 * day + 2 * hour),
      status: 'read',
    },
    {
      id: 'm-s-3',
      conversationId: 'user-su',
      authorName: '苏见月',
      outgoing: false,
      content: '文档我放到 tmp 里了，你直接改就行',
      sentAt: ago(2 * day),
      status: 'sent',
    },
  ],
  'user-chen': [
    {
      id: 'm-c-1',
      conversationId: 'user-chen',
      authorName: '陈嘉木',
      outgoing: false,
      content: '上次那个滚动条的问题最后怎么解决的？',
      sentAt: ago(9 * day + 20 * minute),
      status: 'sent',
    },
    {
      id: 'm-c-2',
      conversationId: 'user-chen',
      authorName: 'Windy',
      outgoing: true,
      content: '两条结论：scrollbar-width 不继承、scrollbar-color 继承；另外 Windows 开浮层滚动条时 webkit 那套完全不生效。',
      sentAt: ago(9 * day + 8 * minute),
      status: 'read',
    },
    {
      id: 'm-c-3',
      conversationId: 'user-chen',
      authorName: '陈嘉木',
      outgoing: false,
      content: '下周的分享要不就讲滚动条那个坑',
      sentAt: ago(9 * day),
      status: 'sent',
    },
  ],
}

/**
 * 拉取会话列表。
 *
 * 预留：接入后端后改为 `getJson<ChatConversation[]>('/chat/conversations')`。
 */
export async function fetchConversations(): Promise<ChatConversation[]> {
  return demoConversations.map((conversation) => ({ ...conversation }))
}

/**
 * 拉取某个会话的消息记录。
 *
 * 预留：接入后端后改为
 * `getJson<ChatMessage[]>(\`/chat/conversations/${encodeURIComponent(conversationId)}/messages\`)`。
 *
 * @throws 会话不存在时抛错，由调用方渲染错误态。
 */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const messages = demoMessages[conversationId]

  if (messages === undefined) {
    throw new Error(`没有找到会话「${conversationId}」的消息记录。`)
  }

  return messages.map((message) => ({ ...message }))
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
