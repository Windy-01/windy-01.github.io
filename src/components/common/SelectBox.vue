<script setup lang="ts" generic="T extends string">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

/**
 * 自定义下拉选择（listbox）。
 *
 * 为什么不用原生 `<select>`：展开的选项列表是**浏览器原生弹出层**，不在页面 DOM 里，
 * 那条蓝底白字的系统高亮、方角白底边框全都改不了，和站内风格对不上。这里自己实现一个
 * 按钮 + `role="listbox"` 弹层，闭合态与展开态都走同一套 `--sb-*` 变量。
 *
 * ⚠️ 弹层必须 teleport 到 body：`.settings-dialog__panel` 上有 `backdrop-filter`（会为
 * fixed 后代创建包含块）**且** `overflow: hidden`，留在原地的话 `position: fixed` 也会被裁掉。
 * 代价是弹层脱离了 `--sd-*` 与 `.dark-mode` 的作用域，所以打开时把触发器上解析好的变量
 * 用内联样式搬过去（见 `popupVariables`）。
 */
const props = defineProps<{
  modelValue: T
  options: readonly { value: T, label: string }[]
  /** 可见 label 元素的 id；给了就把它挂到按钮与弹层上做无障碍名称。 */
  labelledby?: string
  /** 没有可见 label 时的兜底无障碍名称。 */
  ariaLabel?: string
  /** 当前值不在 options 里时的占位文案。 */
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

/** 弹层要搬到 body，所以 id 自己生成，保证多个下拉的 aria 关联不串。 */
const uid = useId()
const listId = `select-box-list-${uid}`
const optionId = (index: number) => `select-box-opt-${uid}-${index}`

const open = ref(false)
const activeIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const popupStyle = ref<Record<string, string>>({})

/** 弹层最大高度；剩余空间不够时按可用空间收缩。 */
const listMaxHeight = 240
/** 弹层与触发器之间的间距。 */
const listGap = 6

const placeholderText = computed(() => props.placeholder ?? '请选择')

const selectedIndex = computed(() => props.options.findIndex((option) => option.value === props.modelValue))

const selectedLabel = computed(() => {
  const hit = props.options[selectedIndex.value]
  if (hit !== undefined) return hit.label
  return props.modelValue === '' ? placeholderText.value : props.modelValue
})

/**
 * 这些变量定义在 `.select-box` 上、由触发器继承。弹层搬到 body 后继承链断了，
 * 所以打开时从触发器的计算样式里取出来（`var()` 此时已解析成实际颜色）再内联回去。
 */
const popupVariables = [
  '--sb-bg',
  '--sb-border',
  '--sb-text',
  '--sb-title',
  '--sb-muted',
  '--sb-accent',
  '--sb-hover',
  '--sb-ring',
  '--sb-popup-bg',
  '--sb-popup-border',
  '--sb-shadow',
] as const

/** 按触发器的位置算出弹层的 fixed 坐标、宽度与最大高度，并搬来配色变量。 */
function updatePopupStyle() {
  const trigger = triggerRef.value
  if (trigger === null) return

  const rect = trigger.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - listGap
  const spaceAbove = rect.top - listGap
  // 下方连最小可用高度都放不下、且上方更宽敞时，向上翻转。
  const flipUp = spaceBelow < Math.min(listMaxHeight, 140) && spaceAbove > spaceBelow
  const maxHeight = Math.max(96, Math.min(listMaxHeight, flipUp ? spaceAbove : spaceBelow))

  const next: Record<string, string> = {
    left: `${Math.round(rect.left)}px`,
    width: `${Math.round(rect.width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
  }
  if (flipUp) next.bottom = `${Math.round(window.innerHeight - rect.top + listGap)}px`
  else next.top = `${Math.round(rect.bottom + listGap)}px`

  const triggerStyles = window.getComputedStyle(trigger)
  for (const name of popupVariables) {
    const value = triggerStyles.getPropertyValue(name).trim()
    if (value !== '') next[name] = value
  }

  popupStyle.value = next
}

/** 把当前高亮项滚进可视区（弹层自己滚动，`block: 'nearest'` 不动外层）。 */
function scrollActiveIntoView() {
  void nextTick(() => {
    const active = listRef.value?.querySelector<HTMLElement>('.select-box__option.is-active')
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function openList() {
  if (open.value) return
  open.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  updatePopupStyle()
  void nextTick(() => {
    // 弹层挂上后尺寸才准，再量一次；随后把焦点交给 listbox 接管键盘。
    updatePopupStyle()
    listRef.value?.focus({ preventScroll: true })
    scrollActiveIntoView()
  })
}

function closeList(restoreFocus = true) {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  // 点外部关闭时不要把焦点抢回按钮，否则会打断用户的下一个点击目标。
  if (restoreFocus) triggerRef.value?.focus({ preventScroll: true })
}

function toggleList() {
  if (open.value) closeList()
  else openList()
}

function commit(index: number) {
  const option = props.options[index]
  if (option === undefined) {
    closeList()
    return
  }
  if (option.value !== props.modelValue) emit('update:modelValue', option.value)
  closeList()
}

/** 触发器只在「关着」的时候接键盘 —— 展开后焦点已交给弹层。 */
function handleTriggerKeydown(event: KeyboardEvent) {
  const keys = ['ArrowDown', 'ArrowUp', 'Enter', ' ']
  if (!keys.includes(event.key)) return
  // 空格默认还会触发 click，这里拦掉，避免「打开又被 click 关掉」。
  event.preventDefault()
  openList()
}

function handleListKeydown(event: KeyboardEvent) {
  const count = props.options.length

  // ⚠️ 拦下的键不要再冒泡出去：设置弹窗在 window 上监听 Escape，
  // 不拦住的话「按 Esc 收起下拉」会把整个设置弹窗一起关掉。
  // Tab 例外 —— 它是焦点移出，交给浏览器照常处理。
  if (event.key !== 'Tab') event.stopPropagation()

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (count > 0) {
        activeIndex.value = (activeIndex.value + 1) % count
        scrollActiveIntoView()
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (count > 0) {
        activeIndex.value = (activeIndex.value - 1 + count) % count
        scrollActiveIntoView()
      }
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = 0
      scrollActiveIntoView()
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = count - 1
      scrollActiveIntoView()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      commit(activeIndex.value)
      break
    case 'Escape':
      event.preventDefault()
      closeList()
      break
    case 'Tab':
      // 不拦 Tab，让焦点自然移走，只把弹层收起来。
      closeList(false)
      break
    default:
      break
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (rootRef.value?.contains(target) === true) return
  // 弹层已经 teleport 到 body，不再是 root 的后代，必须单独判断。
  if (listRef.value?.contains(target) === true) return
  closeList(false)
}

/** 面板内滚动 / 窗口尺寸变化时跟着走，否则弹层会和触发器脱开。 */
function handleViewportChange() {
  if (open.value) updatePopupStyle()
}

onMounted(() => {
  // 用捕获阶段，才能收到设置面板内部那个滚动容器的 scroll。
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})

// 外部改了值（例如设置面板的「恢复默认」）时，若弹层正开着就把高亮同步过去。
watch(
  () => props.modelValue,
  () => {
    if (!open.value) return
    activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  },
)
</script>

<template>
  <div ref="rootRef" class="select-box">
    <button
      ref="triggerRef"
      type="button"
      class="select-box__trigger"
      :class="{ 'is-open': open }"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-labelledby="labelledby"
      :aria-label="labelledby === undefined ? ariaLabel : undefined"
      @click="toggleList"
      @keydown="handleTriggerKeydown"
    >
      <span class="select-box__value">{{ selectedLabel }}</span>
      <svg class="select-box__arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="M4 6.5 8 10.5l4-4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Teleport to="body">
      <ul
        v-if="open"
        :id="listId"
        ref="listRef"
        class="select-box__list"
        role="listbox"
        tabindex="-1"
        :aria-labelledby="labelledby"
        :aria-label="labelledby === undefined ? ariaLabel : undefined"
        :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
        :style="popupStyle"
        @keydown="handleListKeydown"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="option.value"
          class="select-box__option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': option.value === modelValue }"
          role="option"
          :aria-selected="option.value === modelValue"
          @pointerenter="activeIndex = index"
          @click="commit(index)"
        >
          <span class="select-box__option-text">{{ option.label }}</span>
          <svg
            v-if="option.value === modelValue"
            class="select-box__check"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M3.5 8.5 6.5 11.5 12.5 5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<style scoped>
/*
 * 配色统一走 --sb-*：优先取宿主（设置弹窗）的 --sd-*，没有就回落到下面这套默认值，
 * 这样组件搬到别的容器里也能独立工作。弹层靠 JS 把这组变量搬过去，见 script 里的注释。
 */
.select-box {
  --sb-bg: var(--sd-field-bg, rgb(255 255 255 / 80%));
  --sb-border: var(--sd-field-border, rgb(15 23 42 / 14%));
  --sb-text: var(--sd-text, #475569);
  --sb-title: var(--sd-title, #0f172a);
  --sb-muted: var(--sd-muted, #64748b);
  --sb-accent: var(--sd-accent, #1d4ed8);
  --sb-hover: rgb(37 99 235 / 8%);
  --sb-ring: var(--sd-nav-active, rgb(37 99 235 / 12%));
  --sb-popup-bg: rgb(255 255 255 / 96%);
  --sb-popup-border: rgb(15 23 42 / 12%);
  --sb-shadow: 0 16px 40px rgb(15 23 42 / 18%);

  position: relative;
  display: block;
}

/* 脱离设置弹窗（没有 --sd-*）时的暗色兜底。 */
:global(.dark-mode .select-box) {
  --sb-hover: rgb(125 211 252 / 12%);
  --sb-popup-bg: rgb(15 23 42 / 96%);
  --sb-popup-border: rgb(255 255 255 / 14%);
  --sb-shadow: 0 16px 40px rgb(0 0 0 / 50%);
}

.select-box__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 0 11px 0 10px;
  border: 1px solid var(--sb-border);
  border-radius: 9px;
  background-color: var(--sb-bg);
  color: var(--sb-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  text-align: left;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.select-box__trigger:hover {
  border-color: var(--sb-accent);
}

.select-box__trigger:focus-visible,
.select-box__trigger.is-open {
  border-color: var(--sb-accent);
  box-shadow: 0 0 0 3px var(--sb-ring);
  outline: none;
}

.select-box__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-box__arrow {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: var(--sb-muted);
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.select-box__trigger:hover .select-box__arrow,
.select-box__trigger.is-open .select-box__arrow {
  color: var(--sb-accent);
}

.select-box__trigger.is-open .select-box__arrow {
  transform: rotate(180deg);
}

/*
 * ⚠️ `position: fixed` 必须写在这里（不能只靠 JS 内联）：只给 top/left 而 position 仍是
 * static 的话坐标会被忽略，弹层会掉到页面最底下、还被设置弹窗的遮罩挡住。
 * 具体的 top/left/width/max-height 与配色变量由 JS 内联下发。
 */
.select-box__list {
  position: fixed;
  /* 高于设置弹窗（z-index: 120），否则会被它的遮罩盖住 */
  z-index: 200;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  border: 1px solid var(--sb-popup-border);
  border-radius: 10px;
  background-color: var(--sb-popup-bg);
  box-shadow: var(--sb-shadow);
  color: var(--sb-text);
  font-size: 0.86rem;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.select-box__list:focus {
  outline: none;
}

.select-box__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 7px;
  color: var(--sb-text);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.select-box__option.is-active {
  background-color: var(--sb-hover);
}

.select-box__option.is-selected {
  color: var(--sb-accent);
  font-weight: 600;
}

.select-box__option-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-box__check {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
}
</style>
