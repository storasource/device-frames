import sharp from "sharp"
import type { DeviceMockupConfig, Orientation } from "./types.js"

// ---------------------------------------------------------------------------
// Inline perspective transform (replaces `perspective-transform` npm package
// which has a strict-mode compatibility bug with ESM).
// ---------------------------------------------------------------------------

function round10(num: number): number {
  return Math.round(num * 10000000000) / 10000000000
}

/**
 * Invert an NxN matrix using Gauss-Jordan elimination.
 */
function invertMatrix(a: number[][]): number[][] {
  const n = a.length
  // Clone
  const A = a.map((row) => [...row])
  const I = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0)
    row[i] = 1
    return row
  })

  for (let j = 0; j < n; j++) {
    // Partial pivot
    let best = j
    let bestVal = Math.abs(A[j][j])
    for (let i = j + 1; i < n; i++) {
      const v = Math.abs(A[i][j])
      if (v > bestVal) {
        best = i
        bestVal = v
      }
    }
    ;[A[j], A[best]] = [A[best], A[j]]
    ;[I[j], I[best]] = [I[best], I[j]]

    const pivot = A[j][j]
    for (let k = 0; k < n; k++) {
      A[j][k] /= pivot
      I[j][k] /= pivot
    }

    for (let i = 0; i < n; i++) {
      if (i === j) continue
      const factor = A[i][j]
      for (let k = 0; k < n; k++) {
        A[i][k] -= A[j][k] * factor
        I[i][k] -= I[j][k] * factor
      }
    }
  }

  return I
}

function matMul(a: number[][], b: number[][]): number[][] {
  const rows = a.length
  const cols = b[0].length
  const inner = b.length
  const result: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0)
  )
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] += a[i][k] * b[k][j]
      }
    }
  }
  return result
}

function transpose(a: number[][]): number[][] {
  const rows = a.length
  const cols = a[0].length
  const result: number[][] = Array.from({ length: cols }, () =>
    new Array(rows).fill(0)
  )
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = a[i][j]
    }
  }
  return result
}

function matVecMul(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((sum, val, j) => sum + val * v[j], 0))
}

/**
 * Compute the 8 perspective transform coefficients that map
 * `srcPts` (flat array of 4 x,y pairs) to `dstPts`.
 */
function computeCoeffs(
  srcPts: number[],
  dstPts: number[],
  isInverse: boolean
): number[] {
  let sp = srcPts
  let dp = dstPts
  if (isInverse) {
    ;[sp, dp] = [dp, sp]
  }

  const matA = [
    [sp[0], sp[1], 1, 0, 0, 0, -dp[0] * sp[0], -dp[0] * sp[1]],
    [0, 0, 0, sp[0], sp[1], 1, -dp[1] * sp[0], -dp[1] * sp[1]],
    [sp[2], sp[3], 1, 0, 0, 0, -dp[2] * sp[2], -dp[2] * sp[3]],
    [0, 0, 0, sp[2], sp[3], 1, -dp[3] * sp[2], -dp[3] * sp[3]],
    [sp[4], sp[5], 1, 0, 0, 0, -dp[4] * sp[4], -dp[4] * sp[5]],
    [0, 0, 0, sp[4], sp[5], 1, -dp[5] * sp[4], -dp[5] * sp[5]],
    [sp[6], sp[7], 1, 0, 0, 0, -dp[6] * sp[6], -dp[6] * sp[7]],
    [0, 0, 0, sp[6], sp[7], 1, -dp[7] * sp[6], -dp[7] * sp[7]],
  ]

  const At = transpose(matA)
  const AtA = matMul(At, matA)
  const AtAinv = invertMatrix(AtA)
  const AtAinvAt = matMul(AtAinv, At)
  const coeffs = matVecMul(AtAinvAt, dp)

  for (let i = 0; i < coeffs.length; i++) {
    coeffs[i] = round10(coeffs[i])
  }
  coeffs[8] = 1

  return coeffs
}

interface PerspectiveTransformResult {
  transform: (x: number, y: number) => [number, number]
  transformInverse: (x: number, y: number) => [number, number]
}

/**
 * Create a perspective transform mapping between two sets of four
 * corner points (flat arrays: [x0,y0, x1,y1, x2,y2, x3,y3]).
 */
function perspectiveTransform(
  srcPts: number[],
  dstPts: number[]
): PerspectiveTransformResult {
  const coeffs = computeCoeffs(srcPts, dstPts, false)
  const coeffsInv = computeCoeffs(srcPts, dstPts, true)

  return {
    transform(x: number, y: number): [number, number] {
      const denom = coeffs[6] * x + coeffs[7] * y + 1
      return [
        (coeffs[0] * x + coeffs[1] * y + coeffs[2]) / denom,
        (coeffs[3] * x + coeffs[4] * y + coeffs[5]) / denom,
      ]
    },
    transformInverse(x: number, y: number): [number, number] {
      const denom = coeffsInv[6] * x + coeffsInv[7] * y + 1
      return [
        (coeffsInv[0] * x + coeffsInv[1] * y + coeffsInv[2]) / denom,
        (coeffsInv[3] * x + coeffsInv[4] * y + coeffsInv[5]) / denom,
      ]
    },
  }
}

// ---------------------------------------------------------------------------
// Pixel-level transform
// ---------------------------------------------------------------------------

/**
 * Apply a perspective transform to raw pixel data.
 * Maps each destination pixel back to the source via the forward transform.
 */
async function applyPerspectiveTransform(
  inputBuffer: Buffer,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  transform: { transform: (x: number, y: number) => [number, number] }
): Promise<Buffer> {
  const { data, info } = await sharp(inputBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const outputBuffer = Buffer.alloc(dstWidth * dstHeight * 4)

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const [srcX, srcY] = transform.transform(x, y)

      if (srcX >= 0 && srcX < srcWidth && srcY >= 0 && srcY < srcHeight) {
        const srcXInt = Math.floor(srcX)
        const srcYInt = Math.floor(srcY)
        const srcIdx = (srcYInt * info.width + srcXInt) * info.channels
        const dstIdx = (y * dstWidth + x) * 4

        outputBuffer[dstIdx] = data[srcIdx]
        outputBuffer[dstIdx + 1] = data[srcIdx + 1]
        outputBuffer[dstIdx + 2] = data[srcIdx + 2]
        outputBuffer[dstIdx + 3] = info.channels === 4 ? data[srcIdx + 3] : 255
      }
    }
  }

  return sharp(outputBuffer, {
    raw: {
      width: dstWidth,
      height: dstHeight,
      channels: 4,
    },
  })
    .png()
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resize a screenshot to the device display resolution and apply the
 * perspective transform so that it maps onto the screen coordinates
 * defined in the device config.
 *
 * Returns a PNG buffer of just the transformed screenshot (no frame).
 */
export async function createDeviceMockup(
  screenshotBuffer: Buffer,
  deviceConfig: DeviceMockupConfig,
  orientation: Orientation = "portrait"
): Promise<Buffer> {
  const [targetWidth, targetHeight] = deviceConfig.displayResolution
  const coords = deviceConfig.screenCoords[orientation]

  // Resize the screenshot to the device's native display resolution
  const resizedScreenshot = await sharp(screenshotBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer()

  // Compute the bounding box of the destination screen region
  const minX = Math.min(...coords.map((c) => c[0]))
  const maxX = Math.max(...coords.map((c) => c[0]))
  const minY = Math.min(...coords.map((c) => c[1]))
  const maxY = Math.max(...coords.map((c) => c[1]))

  const screenWidth = maxX - minX
  const screenHeight = maxY - minY

  // Source corners: full screenshot rectangle
  const srcCorners = [0, 0, targetWidth, 0, targetWidth, targetHeight, 0, targetHeight]

  // Destination corners: screen coords offset to the bounding box origin
  const dstCorners = [
    coords[0][0] - minX,
    coords[0][1] - minY,
    coords[1][0] - minX,
    coords[1][1] - minY,
    coords[2][0] - minX,
    coords[2][1] - minY,
    coords[3][0] - minX,
    coords[3][1] - minY,
  ]

  const transform = perspectiveTransform(srcCorners, dstCorners)

  const transformedScreenshot = await applyPerspectiveTransform(
    resizedScreenshot,
    targetWidth,
    targetHeight,
    screenWidth,
    screenHeight,
    transform
  )

  return transformedScreenshot
}

/**
 * Create a full device mockup by compositing the screenshot onto a
 * device frame PNG. The screenshot is perspective-transformed to fit
 * the screen region, then layered under the frame overlay.
 */
export async function compositeOnDeviceFrame(
  screenshotBuffer: Buffer,
  frameBuffer: Buffer,
  deviceConfig: DeviceMockupConfig,
  orientation: Orientation = "portrait"
): Promise<Buffer> {
  const transformedScreenshot = await createDeviceMockup(
    screenshotBuffer,
    deviceConfig,
    orientation
  )

  const coords = deviceConfig.screenCoords[orientation]
  const minX = Math.min(...coords.map((c) => c[0]))
  const minY = Math.min(...coords.map((c) => c[1]))

  const frameMeta = await sharp(frameBuffer).metadata()
  const result = await sharp({
    create: {
      width: frameMeta.width!,
      height: frameMeta.height!,
      channels: 4 as const,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: transformedScreenshot, left: minX, top: minY },
      { input: frameBuffer, left: 0, top: 0 },
    ])
    .png()
    .toBuffer()

  return result
}
