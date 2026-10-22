/**
 * 头像图片的浏览器内统一处理。
 *
 * 目标只有一个：**不管调用方给进来什么图片，上传出去的都是「正方形 PNG」**。
 *
 * 之所以单独成文件，是因为处理逻辑要同时被两处用到：
 * - `AvatarCropper.vue` 拿 `avatarOutputSize` 做裁剪画布尺寸；
 * - `uploadAvatar()` 在上传前再兜一次底（万一将来有别的入口直接传原图）。
 *
 * 全部用原生 canvas，不引第三方库 —— 为一个头像加依赖不划算。
 */

/** 头像最终边长（像素）。正方形，页面按圆形展示。 */
export const avatarOutputSize = 512

/** 统一导出的格式。PNG 支持透明，头像常用。 */
export const avatarMimeType = 'image/png'

/**
 * 头像体积上限（字节）。
 *
 * 512×512 的 PNG 照片通常在 200–600 KB，1 MB 基本不会触发降级；
 * 真超了才按下面的阶梯缩尺寸 —— PNG 没有质量参数可调，只能靠尺寸控体积。
 */
export const avatarMaxBytes = 1024 * 1024

/** 超体积时依次尝试的边长，从大到小。 */
const avatarSizeLadder: readonly number[] = [avatarOutputSize, 384, 256]

/**
 * 把图片解码成 `<img>` 元素。
 *
 * 用 `<img>` 而不是 `createImageBitmap()`：前者对带 EXIF 方向信息的手机照片
 * 会自动按方向解码（`naturalWidth/Height` 就是旋转后的值），后者在旧浏览器上
 * 还得额外处理 `imageOrientation`。头像这种小图不值得为性能冒兼容风险。
 */
function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      // 解码完成后 object URL 就没用了，立刻释放。
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('这张图片读不出来，换一张试试。'))
    }

    image.src = url
  })
}

/**
 * 按 `cover` 居中裁成正方形并导出 PNG。
 *
 * `cover` 的含义：短边刚好等于目标边长，长边溢出部分从中间裁掉。
 * 与 `AvatarCropper` 里的基准比例是同一套算法，所以两处结果一致。
 */
function drawSquare(image: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')

  if (context === null) {
    return Promise.reject(new Error('当前浏览器不支持 canvas，无法处理图片。'))
  }

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('导出图片失败，请换一张试试。'))
        return
      }

      resolve(blob)
    }, avatarMimeType)
  })
}

/**
 * 把任意图片规整成统一的头像格式：`avatarOutputSize × avatarOutputSize` 的 PNG。
 *
 * - **已经合规就原样返回**（尺寸、格式、体积都对）：裁剪器导出的图会走这条路，
 *   不会有第二次编码，也就没有画质损失。
 * - 尺寸不对 / 不是 PNG → 居中裁成正方形再导出。
 * - 体积超上限 → 按 `avatarSizeLadder` 逐步缩尺寸，直到达标；
 *   最小档仍超标也照样返回（宁可小一点也要让用户传得上去）。
 *
 * @throws 图片解码失败、canvas 不可用时抛 `Error`，文案可直接展示。
 */
export async function normalizeAvatar(source: Blob): Promise<Blob> {
  // 没有 DOM 的环境（SSR / 纯逻辑测试）没法处理，原样交回去。
  if (typeof document === 'undefined') {
    return source
  }

  const image = await decodeImage(source)

  const isPng = source.type === avatarMimeType
  const isSquare =
    image.naturalWidth === image.naturalHeight && image.naturalWidth === avatarOutputSize

  // 规格已经完全合规：直接透传，省一次重绘。
  if (isPng && isSquare && source.size <= avatarMaxBytes) {
    return source
  }

  // 尺寸格式都对、只是偏大：不重绘（重绘也压不下去），直接走降尺寸。
  let result = isPng && isSquare ? source : await drawSquare(image, avatarOutputSize)

  if (result.size <= avatarMaxBytes) {
    return result
  }

  for (const size of avatarSizeLadder.slice(1)) {
    result = await drawSquare(image, size)

    if (result.size <= avatarMaxBytes) {
      return result
    }
  }

  return result
}
