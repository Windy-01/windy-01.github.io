export interface SearchEngineConfig {
  id: string
  name: string
  icon: string
  pattern: RegExp
  url: string
}

export const searchEngines: SearchEngineConfig[] = [
  {
    id: 'bing',
    name: 'Bing',
    icon: 'https://cn.bing.com/favicon.ico',
    pattern: /^(?:!b|bing)\s+/i,
    url: 'https://www.bing.com/search?q={query}',
  },
  {
    id: 'google',
    name: 'Google',
    icon: '',
    pattern: /^(?:!g|google)\s+/i,
    url: 'https://www.google.com/search?q={query}',
  },
]

export const defaultSearchEngine = searchEngines[0]

export function resolveSearchEngine(query: string) {
  const normalizedQuery = query.trim()

  return searchEngines.find((engine) => engine.pattern.test(normalizedQuery))
    ?? defaultSearchEngine
}

export function createSearchUrl(engine: SearchEngineConfig, query: string) {
  const normalizedQuery = query.trim()
  const searchQuery = normalizedQuery.replace(engine.pattern, '').trim()

  return engine.url.replace('{query}', encodeURIComponent(searchQuery || normalizedQuery))
}
