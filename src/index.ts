import sharp from "sharp"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { getDevice, listDevices } from "./devices.js"
import { compositeOnDeviceFrame, createDeviceMockup } from "./compositor.js"
import type { FrameOptions } from "./types.js"

// Re-exports
export { listDevices, getDevice } from "./devices.js"
export { DEVICE_MOCKUPS } from "./devices.js"
export { createDeviceMockup, compositeOnDeviceFrame } from "./compositor.js"
export type {
  DeviceMockupConfig,
  Orientation,
  FrameOptions,
  FrameResult,
} from "./types.js"

/**
 * Resolve the `frames/` directory that ships with this package.
 * Works for both ESM (import.meta.url) and CJS (__dirname).
 */
function resolveFramesDir(): string {
  try {
    // ESM path
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    return path.resolve(__dirname, "..", "frames")
  } catch {
    // CJS fallback
    return path.resolve(__dirname, "..", "frames")
  }
}

/**
 * Frame a screenshot inside a device bezel.
 *
 * @param input - A Buffer containing the screenshot, or a file path string.
 * @param options - Device id, orientation, output format, and quality.
 * @returns A Buffer of the composited image.
 */
export async function frameScreenshot(
  input: Buffer | string,
  options: FrameOptions
): Promise<Buffer> {
  // Resolve screenshot buffer
  const screenshotBuffer =
    typeof input === "string" ? await fs.readFile(input) : input

  // Resolve device config
  const deviceConfig = getDevice(options.device)
  if (!deviceConfig) {
    throw new Error(
      `Unknown device: "${options.device}". Use listDevices() to see available devices.`
    )
  }

  const orientation = options.orientation ?? "portrait"

  // Try to load the frame PNG from the frames/ directory
  let result: Buffer
  if (deviceConfig.frameFile) {
    const framesDir = resolveFramesDir()
    const framePath = path.join(framesDir, deviceConfig.frameFile)

    try {
      const frameBuffer = await fs.readFile(framePath)
      result = await compositeOnDeviceFrame(
        screenshotBuffer,
        frameBuffer,
        deviceConfig,
        orientation
      )
    } catch {
      // Frame file not found — fall back to mockup without frame
      result = await createDeviceMockup(
        screenshotBuffer,
        deviceConfig,
        orientation
      )
    }
  } else {
    // No frame file configured
    result = await createDeviceMockup(
      screenshotBuffer,
      deviceConfig,
      orientation
    )
  }

  // Convert to requested output format
  const format = options.format ?? "png"
  if (format === "png") {
    return result
  }

  let pipeline = sharp(result)
  if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: options.quality ?? 90 })
  } else if (format === "webp") {
    pipeline = pipeline.webp({ quality: options.quality ?? 90 })
  }
  return pipeline.toBuffer()
}
