<template>
  <Teleport to=".layout-background">
    <Transition name="avatar-cropper">
      <div
        v-if="open"
        class="avatar-cropper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-cropper-title"
      >
        <div class="avatar-cropper__backdrop" @click="cancel" />

        <div ref="panelRef" class="avatar-cropper__panel" tabindex="-1">
          <h2 id="avatar-cropper-title" class="avatar-cropper__title">裁剪头像</h2>
          <p class="avatar-cropper__hint">
            拖动调整位置，滑块或滚轮缩放。圆形区域就是最终头像。
          </p>

          <div
            ref="viewportRef"
            class="avatar-cropper__viewport"
            :class="{ 'is-dragging': isDragging }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @wheel.prevent="onWheel"
          >
            <img
              ref="imageRef"
              class="avatar-cropper__image"
              :src="src"
              :style="imageStyle"
              alt="待裁剪的头像"
              draggable="false"
              @load="onImageLoad"
              @error="onImageError"
            >
            <!-- 圆形遮罩：圆外压暗，明确告诉用户哪块会被裁掉 -->
            <div class="avatar-cropper__ring" aria-hidden="true" />
          </div>

          <label class="avatar-cropper__zoom">
            <span class="avatar-cropper__zoom-label">缩放</span>
            <input
              class="avatar-cropper__range"
              type="range"
              :min="minZoom"
              :max="maxZoom"
              step="0.01"
              :value="zoom"
              :disabled="!isReady"
              @input="onZoomInput"
            >
            <span class="avatar-cropper__zoom-value">{{ Math.round(zoom * 100) }}%</span>
          </label>

          <p v-if="error !== ''" class="avatar-cropper__error" role="alert">{{ error }}</p>

          <div class="avatar-cropper__actions">
            <button class="avatar-cropper__cancel" type="button" @click="cancel">
              取消
            </button>
            <button
              class="avatar-cropper__confirm"
              type="button"
              :disabled="!isReady || exporting"
              @click="confirm"
            >
              {{ exporting ? '处理中…' : '使用这张图片' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { avatarOutputSize } from '../../api/userinfo'

/**
 * 浏览器内头像裁剪。
 *
 * 交互模型是「固定视口 + 移动图片」：视口是正方形，圆形遮罩标出最终头像范围；
 * 图片按 `cover` 铺满视口，用户拖动平移、滑块/滚轮缩放，确认后按同样的变换
 * 用 canvas 重绘一张 `avatarOutputSize × avatarOutputSize` 的 PNG。
 *
 * 只用原生 API，不引入裁剪库 —— 这点体积不值得为一个头像加依赖。
 */
const props = defineProps<{
  /** 是否显示。 */
  open: boolean
  /** 待裁剪图片的地址（通常是 `URL.createObjectURL(file)`）。 */
  src: string
}>()

const emit = defineEmits<{
  /** 用户取消 / 点遮罩 / 按 Esc。 */
  close: []
  /** 裁剪完成，回调里拿到可以直接上传的 PNG。 */
  confirm: [blob: Blob]
}>()

/** 最小缩放固定 1（刚好铺满视口），再小就会露出背景。 */
const minZoom = 1
/** 最大放大倍数；再大就只是糊图，没有意义。 */
const maxZoom = 4

const viewportRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

/** 图片的原始像素尺寸，`load` 之后才有值。 */
const natural = reactive({ w: 0, h: 0 })
/** 视口边长（CSS px），由布局实测得到，不写死。 */
const viewportSize = ref(0)

const zoom = ref(1)
const offset = reactive({ x: 0, y: 0 })

const isDragging = ref(false)
const exporting = ref(false)
const error = ref('')

/** 图片尺寸与视口都就绪才能算变换、才能导出。 */
const isReady = computed(() => natural.w > 0 && natural.h > 0 && viewportSize.value > 0)

/** `cover` 基准比例：短边刚好等于视口边长。 */
const baseScale = computed(() => {
  if (!isReady.value) {
    return 1
  }

  return viewportSize.value / Math.min(natural.w, natural.h)
})

/** 当前实际缩放（基准 × 用户倍数）。 */
const scale = computed(() => baseScale.value * zoom.value)

/** 图片的绝对定位尺寸与位移 —— 与导出时的绘制参数完全一致。 */
const imageStyle = computed(() => ({
  width: `${natural.w * scale.value}px`,
  height: `${natural.h * scale.value}px`,
  transform: `translate(${offset.x}px, ${offset.y}px)`,
}))

/** 把图片夹在视口内：不允许拖出留白。 */
function clampOffset() {
  const size = viewportSize.value
  const width = natural.w * scale.value
  const height = natural.h * scale.value

  // `size - width` 是负值（cover 保证 width >= size），所以下限是它、上限是 0。
  offset.x = Math.min(0, Math.max(size - width, offset.x))
  offset.y = Math.min(0, Math.max(size - height, offset.y))
}

/** 图片居中。 */
function centerImage() {
  const size = viewportSize.value

  offset.x = (size - natural.w * scale.value) / 2
  offset.y = (size - natural.h * scale.value) / 2
}

/**
 * 缩放，且**保持视口中心不动**。
 *
 * 直接改 `zoom` 会让图片以左上角为原点放大，中心点会漂走 ——
 * 先记下视口中心对应的图片坐标，改完比例再反推回去。
 */
function setZoom(next: number) {
  if (!isReady.value) {
    return
  }

  const clamped = Math.min(maxZoom, Math.max(minZoom, next))

  if (clamped === zoom.value) {
    return
  }

  const current = scale.value
  const centerX = (viewportSize.value / 2 - offset.x) / current
  const centerY = (viewportSize.value / 2 - offset.y) / current

  zoom.value = clamped

  const nextScale = baseScale.value * clamped
  offset.x = viewportSize.value / 2 - centerX * nextScale
  offset.y = viewportSize.value / 2 - centerY * nextScale
  clampOffset()
}

function onZoomInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)

  if (Number.isFinite(value)) {
    setZoom(value)
  }
}

function onWheel(event: WheelEvent) {
  if (!isReady.value) {
    return
  }

  // 每次滚一格放大 8%，方向按 deltaY 的正负判断。
  setZoom(zoom.value * (event.deltaY < 0 ? 1.08 : 1 / 1.08))
}

/** 拖动的起点快照；`null` 表示当前没在拖。 */
let dragStart: { x: number, y: number, offsetX: number, offsetY: number } | null = null

function onPointerDown(event: PointerEvent) {
  if (!isReady.value) {
    return
  }

  // 只响应主键；触屏 / 手写笔的 button 也是 0。
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  dragStart = {
    x: event.clientX,
    y: event.clientY,
    offsetX: offset.x,
    offsetY: offset.y,
  }
  isDragging.value = true
  // 捕获指针：拖出视口时仍然收得到 move，松手也不会卡住。
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (dragStart === null) {
    return
  }

  offset.x = dragStart.offsetX + (event.clientX - dragStart.x)
  offset.y = dragStart.offsetY + (event.clientY - dragStart.y)
  clampOffset()
}

function onPointerUp(event: PointerEvent) {
  if (dragStart === null) {
    return
  }

  dragStart = null
  isDragging.value = false

  const target = event.currentTarget as HTMLElement

  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
}

/** 实测视口边长；窗口尺寸变化时也要重新量。 */
function measureViewport() {
  const element = viewportRef.value

  if (element === null) {
    return
  }

  // ⚠️ 用 `offsetWidth` 而不是 `getBoundingClientRect()`：弹窗有入场动画
  // （`scale(0.98)`），rect 量到的是**缩放后**的尺寸，会让裁剪比例整体偏小 2%。
  const size = element.offsetWidth

  if (size > 0 && size !== viewportSize.value) {
    viewportSize.value = size
  }
}

function onImageLoad() {
  const image = imageRef.value

  if (image === null) {
    return
  }

  natural.w = image.naturalWidth
  natural.h = image.naturalHeight
  error.value = ''

  measureViewport()
  zoom.value = minZoom
  centerImage()
}

function onImageError() {
  error.value = '这张图片读不出来，换一张试试。'
}

/** 把当前变换重绘到 canvas，导出 PNG。 */
function renderCrop(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = avatarOutputSize
    canvas.height = avatarOutputSize

    const context = canvas.getContext('2d')

    if (context === null) {
      reject(new Error('当前浏览器不支持 canvas，无法裁剪。'))
      return
    }

    // CSS px → 输出 px 的换算系数；位移与尺寸都要乘它。
    const ratio = avatarOutputSize / viewportSize.value

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      offset.x * ratio,
      offset.y * ratio,
      natural.w * scale.value * ratio,
      natural.h * scale.value * ratio,
    )

    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('导出图片失败，请换一张试试。'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}

async function confirm() {
  const image = imageRef.value

  if (image === null || !isReady.value || exporting.value) {
    return
  }

  exporting.value = true
  error.value = ''

  try {
    const blob = await renderCrop(image)
    emit('confirm', blob)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '裁剪失败，请重试。'
  } finally {
    exporting.value = false
  }
}

function cancel() {
  if (exporting.value) {
    return
  }

  emit('close')
}

/** 每次打开都从零开始：重新居中、缩放归位、清掉上次的错误。 */
async function reset() {
  natural.w = 0
  natural.h = 0
  zoom.value = minZoom
  offset.x = 0
  offset.y = 0
  error.value = ''
  exporting.value = false

  await nextTick()
  measureViewport()

  // 图片来自缓存时不会再触发 `load`，这里补一次。
  const image = imageRef.value

  if (image !== null && image.complete && image.naturalWidth > 0) {
    onImageLoad()
  }

  panelRef.value?.focus()
}

watch(
  () => [props.open, props.src] as const,
  ([open]) => {
    if (open) {
      void reset()
    }
  },
  { immediate: true },
)

/** Esc 关闭：弹窗没有焦点时也能响应，所以监听 window。 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    cancel()
  }
}

/** 窗口尺寸变化会改变视口边长，需要重新量并夹一次边界。 */
function onResize() {
  if (!props.open) {
    return
  }

  measureViewport()
  clampOffset()
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
}

/** 打开时锁住页面滚动，关闭后恢复原来的值。 */
let previousOverflow = ''

watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') {
      return
    }

    if (open) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return
    }

    document.body.style.overflow = previousOverflow
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)

  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousOverflow
  }
})
</script>

<style scoped>
.avatar-cropper {
  --crop-text: #1e293b;
  --crop-heading: #0f172a;
  --crop-muted: #64748b;
  --crop-border: rgb(15 23 42 / 12%);
  --crop-surface: #ffffff;
  --crop-accent: #2563eb;
  --crop-stage: rgb(15 23 42 / 88%);

  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 20px;
}

.avatar-cropper__backdrop {
  position: absolute;
  inset: 0;
  background-color: rgb(15 23 42 / 52%);
  backdrop-filter: blur(2px);
}

.avatar-cropper__panel {
  position: relative;
  width: min(380px, 100%);
  padding: 20px;
  border: 1px solid var(--crop-border);
  border-radius: 16px;
  background-color: var(--crop-surface);
  box-shadow: 0 24px 60px rgb(15 23 42 / 28%);
  color: var(--crop-text);
  outline: none;
}

.avatar-cropper__title {
  margin: 0;
  color: var(--crop-heading);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.4;
}

.avatar-cropper__hint {
  margin: 6px 0 0;
  color: var(--crop-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

/* ---------- 裁剪视口 ---------- */

.avatar-cropper__viewport {
  position: relative;
  width: min(300px, 68vw);
  aspect-ratio: 1 / 1;
  margin: 16px auto 0;
  overflow: hidden;
  border-radius: 12px;
  background-color: var(--crop-stage);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.avatar-cropper__viewport.is-dragging {
  cursor: grabbing;
}

.avatar-cropper__image {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: top left;
  pointer-events: none;
  will-change: transform;
}

/* 圆外压暗：`box-shadow` 铺满视口，被 overflow 裁掉，只剩圆环外的部分 */
.avatar-cropper__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgb(15 23 42 / 62%);
  pointer-events: none;
}

/* ---------- 缩放 ---------- */

.avatar-cropper__zoom {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.avatar-cropper__zoom-label {
  flex: 0 0 auto;
  color: var(--crop-muted);
  font-size: 0.78rem;
}

.avatar-cropper__range {
  flex: 1 1 auto;
  min-width: 0;
  accent-color: var(--crop-accent);
  cursor: pointer;
}

.avatar-cropper__zoom-value {
  flex: 0 0 44px;
  color: var(--crop-muted);
  font-size: 0.74rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ---------- 操作 ---------- */

.avatar-cropper__error {
  margin: 10px 0 0;
  color: #dc2626;
  font-size: 0.76rem;
  line-height: 1.5;
}

.avatar-cropper__actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.avatar-cropper__cancel,
.avatar-cropper__confirm {
  flex: 1 1 0;
  min-height: 36px;
  border: 1px solid var(--crop-border);
  border-radius: 8px;
  background-color: transparent;
  color: var(--crop-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.avatar-cropper__confirm {
  border-color: transparent;
  background-color: var(--crop-accent);
  color: #ffffff;
}

.avatar-cropper__confirm:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.avatar-cropper__cancel:hover {
  border-color: var(--crop-accent);
}

.avatar-cropper__confirm:not(:disabled):hover {
  opacity: 0.9;
}

/* ---------- 过渡 ---------- */

.avatar-cropper-enter-active,
.avatar-cropper-leave-active {
  transition: opacity 0.18s ease;
}

.avatar-cropper-enter-active .avatar-cropper__panel,
.avatar-cropper-leave-active .avatar-cropper__panel {
  transition: transform 0.18s ease;
}

.avatar-cropper-enter-from,
.avatar-cropper-leave-to {
  opacity: 0;
}

.avatar-cropper-enter-from .avatar-cropper__panel,
.avatar-cropper-leave-to .avatar-cropper__panel {
  transform: translateY(8px) scale(0.98);
}

/* ---------- 暗色 ----------
   注意写法：`:global()` 会用括号内内容整体替换选择器，
   必须把完整选择器写进括号里。这组规则放在文件末尾，靠顺序赢过上面的同名规则。 */

:global(.dark-mode .avatar-cropper) {
  --crop-text: #e2e8f0;
  --crop-heading: #f8fafc;
  --crop-muted: #94a3b8;
  --crop-border: rgb(255 255 255 / 14%);
  --crop-surface: #16213a;
  --crop-accent: #7dd3fc;
}

:global(.dark-mode .avatar-cropper__confirm) {
  color: #0f172a;
}
</style>
