import type { DeviceMockupConfig } from "./types.js"

export const DEVICE_MOCKUPS: Record<string, DeviceMockupConfig> = {
  "iphone-16-pro": {
    id: "iphone-16-pro",
    name: "iPhone 16 Pro",
    displayResolution: [1206, 2622],
    frameWidth: 1380,
    frameHeight: 2800,
    screenCoords: {
      portrait: [
        [87, 89],
        [1293, 89],
        [1293, 2711],
        [87, 2711],
      ],
      landscape: [
        [2711, 87],
        [2711, 1293],
        [89, 1293],
        [89, 87],
      ],
    },
    frameFile: "apple-iphone-15-pro-black-titanium-portrait.png",
  },
  "iphone-16-pro-max": {
    id: "iphone-16-pro-max",
    name: "iPhone 16 Pro Max",
    displayResolution: [1320, 2868],
    frameWidth: 1496,
    frameHeight: 3046,
    screenCoords: {
      portrait: [
        [88, 89],
        [1408, 89],
        [1408, 2957],
        [88, 2957],
      ],
      landscape: [
        [2957, 88],
        [2957, 1408],
        [89, 1408],
        [89, 88],
      ],
    },
    frameFile: "apple-iphone-15-pro-max-black-titanium-portrait.png",
  },
  "ipad-pro-13": {
    id: "ipad-pro-13",
    name: 'iPad Pro 13"',
    displayResolution: [2064, 2752],
    frameWidth: 2200,
    frameHeight: 2920,
    screenCoords: {
      portrait: [
        [68, 84],
        [2132, 84],
        [2132, 2836],
        [68, 2836],
      ],
      landscape: [
        [2836, 68],
        [2836, 2132],
        [84, 2132],
        [84, 68],
      ],
    },
    frameFile: "apple-ipadpro13-spacegrey-portrait.png",
  },
  "pixel-9-pro": {
    id: "pixel-9-pro",
    name: "Pixel 9 Pro",
    displayResolution: [1344, 2992],
    frameWidth: 978,
    frameHeight: 2100,
    screenCoords: {
      portrait: [
        [92, 94],
        [886, 94],
        [886, 2006],
        [92, 2006],
      ],
      landscape: [
        [2006, 92],
        [2006, 886],
        [94, 886],
        [94, 92],
      ],
    },
    frameFile: "google-pixel-8-obsidian-portrait.png",
  },
  "galaxy-s24-ultra": {
    id: "galaxy-s24-ultra",
    name: "Galaxy S24 Ultra",
    displayResolution: [1440, 3088],
    frameWidth: 1245,
    frameHeight: 2359,
    screenCoords: {
      portrait: [
        [98, 98],
        [1147, 98],
        [1147, 2261],
        [98, 2261],
      ],
      landscape: [
        [2261, 98],
        [2261, 1147],
        [98, 1147],
        [98, 98],
      ],
    },
    frameFile: "samsung-galaxy-s24-ultra-portrait.png",
  },
}

/**
 * List all available device configurations.
 */
export function listDevices(): Array<{
  id: string
  name: string
  displayResolution: [number, number]
  frameWidth: number
  frameHeight: number
}> {
  return Object.values(DEVICE_MOCKUPS).map((d) => ({
    id: d.id,
    name: d.name,
    displayResolution: d.displayResolution,
    frameWidth: d.frameWidth,
    frameHeight: d.frameHeight,
  }))
}

/**
 * Look up a device config by id with fuzzy matching.
 * Normalizes the input (lowercases, replaces spaces/underscores with hyphens)
 * and checks for exact match first, then substring includes.
 */
export function getDevice(id: string): DeviceMockupConfig | undefined {
  const normalizedId = id.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-")

  // Exact match
  if (DEVICE_MOCKUPS[normalizedId]) {
    return DEVICE_MOCKUPS[normalizedId]
  }

  // Substring match (either direction)
  for (const [key, config] of Object.entries(DEVICE_MOCKUPS)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return config
    }
  }

  return undefined
}
