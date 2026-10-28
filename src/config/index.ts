import { computed, reactive, ref } from 'vue'

import { createDefaultConfig, defaultChatStorage, defaultSearchEngine } from './defaults'
import { parseChatLayout } from './chatLayout'
import { parseChatStorage } from './chatStorage'
import { parseSearchHistory } from './chatSearch'
import type { PersistedConfig, SearchEngineConfig, SiteConfig } from './types'
import { readCookie, removeCookie, writeCookie } from '../utils/cookie'

/**
 * 站点配置的**唯一入口**。
 *
 * 所有配置都从 `src/config` 读取，只有一种调用方式：
 *
 * ```ts
 * const { config, defaultEngine, saveConfig, resetConfig } = useConfig()
 * config.backgroundImageUrl   // 读
 * saveConfig({ ... })         // 写（同时落盘）
 * ```
 *
 * 默认值集中在 `./defaults.ts`，组件不要直接引用目录内的其它文件。
 *
 * 持久化：`./types.ts` 里 `PersistedConfig` 描述的那部分会序列化进 cookie，
 * 读取时**逐字段**合并到默认值上 —— cookie 缺失、JSON 损坏、某个字段没写、
 * 值不是字符串，都只让对应字段回落到默认值，而不是整体失效。
 */

/** 存储配置用的 cookie 名。 */
export const configCookieName = 'windy-settings'

/** cookie 有效期（天）。 */
const configCookieMaxAgeDays = 365

/** cookie 里的实际存储结构：只存可编辑字段，其余以默认值为准。 */
interface StoredConfig {
  backgroundImageUrl?: unknown
  defaultSearchEngineId?: unknown
  searchEngines?: Record<string, { name?: unknown, url?: unknown }>
  apiBaseUrl?: unknown
  agentApiBaseUrl?: unknown
  stickyNoteContent?: unknown
  chatLayout?: unknown
  searchHistory?: unknown
  chatStorage?: unknown
}

/** 只接受非空字符串；其余（undefined / 空串 / 非字符串）一律视为「无数据」。 */
function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

/**
 * 读便签正文：**空串是合法值**（用户可能把便签清空），所以只校验类型，
 * 不做非空判断 —— 这一点和 `readString` 不同。
 */
function readNoteContent(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function parseStoredConfig(raw: string | null): StoredConfig | null {
  if (raw === null) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }

    return parsed as StoredConfig
  } catch {
    return null
  }
}

/** 取出一份配置里可持久化的部分。 */
function pickPersisted(source: SiteConfig): PersistedConfig {
  return {
    backgroundImageUrl: source.backgroundImageUrl,
    defaultSearchEngineId: source.defaultSearchEngineId,
    searchEngines: source.searchEngines,
    apiBaseUrl: source.apiBaseUrl,
    agentApiBaseUrl: source.agentApiBaseUrl,
    stickyNoteContent: source.stickyNote.content,
    chatLayout: {
      columnWidths: [...source.chatLayout.columnWidths],
      displayHeight: source.chatLayout.displayHeight,
    },
    searchHistory: [...source.searchHistory],
    chatStorage: {
      mode: source.chatStorage.mode,
      directory: source.chatStorage.directory,
    },
  }
}

/** 序列化：正则等不可编辑字段不落盘，只存名称与地址。 */
function serializeConfig(source: PersistedConfig): string {
  const searchEngines: Record<string, { name: string, url: string }> = {}

  for (const engine of source.searchEngines) {
    searchEngines[engine.id] = { name: engine.name, url: engine.url }
  }

  return JSON.stringify({
    backgroundImageUrl: source.backgroundImageUrl,
    defaultSearchEngineId: source.defaultSearchEngineId,
    searchEngines,
    apiBaseUrl: source.apiBaseUrl,
    agentApiBaseUrl: source.agentApiBaseUrl,
    stickyNoteContent: source.stickyNoteContent,
    chatLayout: {
      columnWidths: source.chatLayout.columnWidths,
      displayHeight: source.chatLayout.displayHeight,
    },
    searchHistory: source.searchHistory,
    chatStorage: {
      mode: source.chatStorage.mode,
      directory: source.chatStorage.directory,
    },
  })
}

/** 把 cookie 数据逐字段合并到默认值上。 */
function loadConfig(): SiteConfig {
  const defaults = createDefaultConfig()
  const stored = parseStoredConfig(readCookie(configCookieName))

  if (stored === null) {
    return defaults
  }

  const searchEngines = defaults.searchEngines.map((engine) => {
    const override = stored.searchEngines?.[engine.id]

    return {
      ...engine,
      name: readString(override?.name, engine.name),
      url: readString(override?.url, engine.url),
    }
  })

  // 默认引擎 id 必须能对上，否则回落到默认值，避免「选中了不存在的引擎」。
  const defaultSearchEngineId = searchEngines.some(
    (engine) => engine.id === stored.defaultSearchEngineId,
  )
    ? (stored.defaultSearchEngineId as string)
    : defaults.defaultSearchEngineId

  return {
    ...defaults,
    backgroundImageUrl: readString(stored.backgroundImageUrl, defaults.backgroundImageUrl),
    defaultSearchEngineId,
    searchEngines,
    apiBaseUrl: readString(stored.apiBaseUrl, defaults.apiBaseUrl),
    agentApiBaseUrl: readString(stored.agentApiBaseUrl, defaults.agentApiBaseUrl),
    stickyNote: {
      ...defaults.stickyNote,
      content: readNoteContent(stored.stickyNoteContent, defaults.stickyNote.content),
    },
    // 分栏比例是用户拖出来的，读回时统一清洗 + 夹取，脏数据回落到默认布局。
    chatLayout: parseChatLayout(stored.chatLayout, defaults.chatLayout),
    // 搜索记录同样只保留「非空字符串 + 去重 + 截断」，脏数据整体回落成空列表。
    searchHistory: parseSearchHistory(stored.searchHistory),
    // 存储配置逐字段清洗：方式不在可选值里、位置为空串都只让对应字段回落。
    chatStorage: parseChatStorage(stored.chatStorage, defaults.chatStorage),
  }
}

function isSameAsDefaults(current: SiteConfig): boolean {
  return serializeConfig(pickPersisted(current))
    === serializeConfig(pickPersisted(createDefaultConfig()))
}

/** 全局唯一的配置状态，模块首次加载时从 cookie 载入。 */
const config = reactive<SiteConfig>(loadConfig())

/** 当前配置是否完全等同于默认值（即 cookie 里没有任何有效数据）。 */
const isUsingDefaults = ref(isSameAsDefaults(config))

/** 当前默认搜索引擎对象；id 失效时回落到列表首项。 */
const defaultEngine = computed<SearchEngineConfig>(() => {
  return config.searchEngines.find((engine) => engine.id === config.defaultSearchEngineId)
    ?? config.searchEngines[0]
    ?? defaultSearchEngine
})

/**
 * 保存配置。
 *
 * 参数是**增量**：只需要传想改的字段，没传的沿用当前运行时配置。
 * 设置面板与便签因此各存各的，不会互相覆盖对方的字段。
 *
 * **先写 cookie，写成功才应用**，避免出现「页面已经变了、刷新却还原」的
 * 不一致状态。返回 false 表示浏览器拒绝写入（cookie 被禁用或数据超出容量），
 * 此时内存状态不变，调用方可以保留表单让用户修正后重试。
 */
export function saveConfig(next: Partial<PersistedConfig>): boolean {
  const merged: PersistedConfig = { ...pickPersisted(config), ...next }

  if (
    !writeCookie(configCookieName, serializeConfig(merged), {
      maxAgeDays: configCookieMaxAgeDays,
    })
  ) {
    return false
  }

  config.backgroundImageUrl = merged.backgroundImageUrl
  config.defaultSearchEngineId = merged.defaultSearchEngineId
  config.searchEngines = merged.searchEngines.map((engine) => ({ ...engine }))
  config.apiBaseUrl = merged.apiBaseUrl
  config.agentApiBaseUrl = merged.agentApiBaseUrl
  config.stickyNote.content = merged.stickyNoteContent
  // 整体替换成一个新对象，方便组件用 `watch(() => config.chatLayout)` 感知变化。
  config.chatLayout = {
    columnWidths: [...merged.chatLayout.columnWidths],
    displayHeight: merged.chatLayout.displayHeight,
  }
  // 同理整体替换，组件可以直接 watch 搜索记录。
  config.searchHistory = parseSearchHistory(merged.searchHistory)
  // 存储配置也整体替换成新对象，方便 watch；写入前统一清洗一次。
  config.chatStorage = parseChatStorage(merged.chatStorage, defaultChatStorage)

  isUsingDefaults.value = isSameAsDefaults(config)

  return true
}

/** 恢复默认：清掉 cookie，并把运行时配置重置为 `./defaults.ts` 的值。 */
export function resetConfig(): void {
  const defaults = createDefaultConfig()

  config.backgroundImageUrl = defaults.backgroundImageUrl
  config.defaultSearchEngineId = defaults.defaultSearchEngineId
  config.searchEngines = defaults.searchEngines
  config.apiBaseUrl = defaults.apiBaseUrl
  config.agentApiBaseUrl = defaults.agentApiBaseUrl
  // 便签正文、聊天分栏比例、搜索记录与存储配置也在 cookie 里，恢复默认时一并重置。
  config.stickyNote = defaults.stickyNote
  config.chatLayout = defaults.chatLayout
  config.searchHistory = [...defaults.searchHistory]
  config.chatStorage = { ...defaults.chatStorage }

  isUsingDefaults.value = true

  removeCookie(configCookieName)
}

export function useConfig() {
  return {
    /** 运行时配置。**只读**，需要修改请调用 `saveConfig()`。 */
    config,
    /** 当前默认搜索引擎。 */
    defaultEngine,
    /** 是否正在使用默认配置（cookie 里没有有效数据）。 */
    isUsingDefaults,
    saveConfig,
    resetConfig,
  }
}

export type {
  ChatLayoutConfig,
  ChatStorageConfig,
  ChatStorageMode,
  PersistedConfig,
  SearchEngineConfig,
  SiteConfig,
  StickyNoteConfig,
} from './types'
export { createSearchUrl, resolveSearchEngine } from './search'
export { defaultChatStorage } from './defaults'
export { isApiBaseUrlInvalid, normalizeApiBaseUrl } from './endpoint'
export { isAgentBaseUrlInvalid, normalizeAgentBaseUrl } from './agentEndpoint'
export {
  buildColumnWidths,
  chatDisplayHeightMax,
  chatDisplayHeightMin,
  chatRailWidth,
  chatSideWidthMax,
  chatSideWidthMin,
  clampDisplayHeight,
  clampSideWidth,
} from './chatLayout'
export {
  chatSearchHistoryMax,
  chatSearchTermMax,
  normalizeSearchTerm,
  parseSearchHistory,
  pushSearchHistory,
} from './chatSearch'
export {
  chatStorageDirectoryMax,
  chatStorageModes,
  parseChatStorage,
} from './chatStorage'
