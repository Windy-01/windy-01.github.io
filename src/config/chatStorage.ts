/**
 * 聊天记录存储配置的约束与纯函数。
 *
 * 和 `./chatLayout.ts` 分工一致：这里只放**约束常量 + 清洗纯函数**，
 * 默认值在 `./defaults.ts`，运行时读写在 `./index.ts`。
 *
 * ⚠️ 目前整块都是**占位**：`mode` / `directory` 只是先把配置位占住，
 * 聊天页还没有真的按它去写磁盘（见 `src/api/chat.ts`）。
 */

import type { ChatStorageConfig, ChatStorageMode } from './types'

/** 可选的存储方式，顺序即设置面板里的展示顺序。 */
export const chatStorageModes: ChatStorageMode[] = ['cache', 'disk']

/** 磁盘存储位置的最大长度（字符），避免一条超长路径把 cookie 撑爆。 */
export const chatStorageDirectoryMax = 160

function isChatStorageMode(value: unknown): value is ChatStorageMode {
  return chatStorageModes.includes(value as ChatStorageMode)
}

/**
 * 清洗磁盘存储位置：去首尾空白 + 截断。
 *
 * **空串视为「没有有效值」**，会回落到默认位置（与 `readString` 同语义）——
 * 一个空的存储路径没有意义，留着只会让界面显示成一片空白。
 */
function readDirectory(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()

  return trimmed === '' ? fallback : trimmed.slice(0, chatStorageDirectoryMax)
}

/**
 * 逐字段清洗一份存储配置：整份数据不是对象、`mode` 不在可选值里、
 * `directory` 不是非空字符串，都只让**对应字段**回落到默认值，而不是整体失效。
 */
export function parseChatStorage(raw: unknown, fallback: ChatStorageConfig): ChatStorageConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ...fallback }
  }

  const source = raw as { mode?: unknown, directory?: unknown }

  return {
    mode: isChatStorageMode(source.mode) ? source.mode : fallback.mode,
    directory: readDirectory(source.directory, fallback.directory),
  }
}
