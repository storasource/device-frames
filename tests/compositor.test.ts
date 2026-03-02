import { describe, it, expect } from "vitest"
import sharp from "sharp"
import { listDevices, getDevice } from "../src/devices.js"
import { createDeviceMockup } from "../src/compositor.js"

describe("devices", () => {
  it("listDevices() returns all 5 devices", () => {
    const devices = listDevices()
    expect(devices).toHaveLength(5)

    const ids = devices.map((d) => d.id)
    expect(ids).toContain("iphone-16-pro")
    expect(ids).toContain("iphone-16-pro-max")
    expect(ids).toContain("ipad-pro-13")
    expect(ids).toContain("pixel-9-pro")
    expect(ids).toContain("galaxy-s24-ultra")
  })

  it("getDevice() returns correct config for exact id", () => {
    const config = getDevice("iphone-16-pro")
    expect(config).toBeDefined()
    expect(config!.id).toBe("iphone-16-pro")
    expect(config!.name).toBe("iPhone 16 Pro")
    expect(config!.displayResolution).toEqual([1206, 2622])
    expect(config!.frameWidth).toBe(1380)
    expect(config!.frameHeight).toBe(2800)
  })

  it("getDevice() fuzzy matches human-readable names", () => {
    const config = getDevice("iPhone 16 Pro")
    expect(config).toBeDefined()
    expect(config!.id).toBe("iphone-16-pro")
  })

  it("getDevice() returns undefined for unknown device", () => {
    expect(getDevice("nokia-3310")).toBeUndefined()
  })
})

describe("compositor", () => {
  it("createDeviceMockup produces a valid PNG buffer", async () => {
    // Create a small solid red test image (100x200)
    const testScreenshot = await sharp({
      create: {
        width: 100,
        height: 200,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer()

    const config = getDevice("iphone-16-pro")!
    const result = await createDeviceMockup(testScreenshot, config, "portrait")

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)

    // Verify it is a valid PNG by reading metadata
    const meta = await sharp(result).metadata()
    expect(meta.format).toBe("png")
    expect(meta.width).toBeGreaterThan(0)
    expect(meta.height).toBeGreaterThan(0)
  })
})
