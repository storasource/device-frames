# @stora-sh/device-frames

Composite screenshots into device bezels -- frameit for Node.js.

[![npm version](https://img.shields.io/npm/v/@stora-sh/device-frames)](https://www.npmjs.com/package/@stora-sh/device-frames)
[![license](https://img.shields.io/npm/l/@stora-sh/device-frames)](https://github.com/storasource/device-frames/blob/main/LICENSE)
[![CI](https://github.com/storasource/device-frames/actions/workflows/ci.yml/badge.svg)](https://github.com/storasource/device-frames/actions/workflows/ci.yml)

## Installation

```bash
npm install @stora-sh/device-frames
```

## API

### `frameScreenshot(input, options)`

Frame a screenshot inside a device bezel.

```ts
import { frameScreenshot } from "@stora-sh/device-frames";

const framed = await frameScreenshot("screenshot.png", {
  device: "iphone-16-pro",
  orientation: "portrait", // optional, default: "portrait"
  format: "png",           // optional: "png" | "jpeg" | "webp"
  quality: 90,             // optional, for jpeg/webp
});

// framed is a Buffer of the composited image
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `input` | `Buffer \| string` | Screenshot buffer or file path |
| `options.device` | `string` | Device ID (see supported devices below) |
| `options.orientation` | `"portrait" \| "landscape"` | Orientation (default: `"portrait"`) |
| `options.format` | `"png" \| "jpeg" \| "webp"` | Output format (default: `"png"`) |
| `options.quality` | `number` | Quality for jpeg/webp (default: `90`) |

### `listDevices()`

Returns an array of all available device configurations.

```ts
import { listDevices } from "@stora-sh/device-frames";

const devices = listDevices();
// [{ id: "iphone-16-pro", name: "iPhone 16 Pro", displayResolution: [1206, 2622], ... }, ...]
```

### `getDevice(id)`

Look up a device config by ID. Supports fuzzy matching -- you can pass `"iPhone 16 Pro"` or `"iphone-16-pro"`.

```ts
import { getDevice } from "@stora-sh/device-frames";

const config = getDevice("iphone-16-pro");
// { id: "iphone-16-pro", name: "iPhone 16 Pro", displayResolution: [1206, 2622], ... }
```

## Supported Devices

| Device | ID | Resolution |
|--------|----|------------|
| iPhone 16 Pro | `iphone-16-pro` | 1206 x 2622 |
| iPhone 16 Pro Max | `iphone-16-pro-max` | 1320 x 2868 |
| iPad Pro 13" | `ipad-pro-13` | 2064 x 2752 |
| Pixel 9 Pro | `pixel-9-pro` | 1344 x 2992 |
| Galaxy S24 Ultra | `galaxy-s24-ultra` | 1440 x 3088 |

## CLI

```bash
npx @stora-sh/device-frames screenshot.png --device iphone-16-pro -o framed.png
```

**Options:**

```
Usage: device-frames <screenshot> --device <id> [options]

Options:
  --device, -d       Device ID (required)
  --orientation, -r  portrait | landscape (default: portrait)
  --output, -o       Output file path (default: framed-<input>)
  --format, -f       png | jpeg | webp (default: png)
  --quality, -q      Output quality for jpeg/webp (default: 90)
  --list             List available devices
  --help, -h         Show this help message
```

**Examples:**

```bash
# Frame with default settings
device-frames screenshot.png --device iphone-16-pro

# Use human-readable device name
device-frames screenshot.png -d "iPhone 16 Pro" -o mockup.png

# Landscape orientation
device-frames screenshot.png -d galaxy-s24-ultra --orientation landscape

# List all available devices
device-frames --list
```

## License

MIT
