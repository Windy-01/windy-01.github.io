/**
 * 搜索引擎相关的纯函数。
 *
 * 属于「搜索引擎配置」这个域，放在 config 目录内，
 * 由 `src/config/index.ts` 统一再导出，组件只需从 `'../../config'` 引入。
 */

import { defaultSearchEngine, defaultSearchEngines } from './defaults'
import type { SearchEngineConfig } from './types'

/**
 * 按查询里的触发前缀（如 `!g `）挑引擎，没命中就用 `fallback`。
 *
 * `engines` / `fallback` 应传入当前运行时配置（见 `useConfig()`），
 * 缺省时使用内置默认值，便于脱离组件单测。
 */
export function resolveSearchEngine(
  query: string,
  engines: SearchEngineConfig[] = defaultSearchEngines,
  fallback: SearchEngineConfig = defaultSearchEngine,
): SearchEngineConfig {
  const normalizedQuery = query.trim()

  return engines.find((engine) => engine.pattern.test(normalizedQuery)) ?? fallback
}

/** 把关键词套进引擎的地址模板，生成最终搜索地址。 */
export function createSearchUrl(engine: SearchEngineConfig, query: string): string {
  const normalizedQuery = query.trim()
  const searchQuery = normalizedQuery.replace(engine.pattern, '').trim()

  return engine.url.replace('{query}', encodeURIComponent(searchQuery || normalizedQuery))
}
