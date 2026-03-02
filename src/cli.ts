#!/usr/bin/env node

import fs from "fs/promises"
import path from "path"
import { frameScreenshot } from "./index.js"
import { listDevices } from "./devices.js"
import type { Orientation } from "./types.js"

function printUsage(): void {
  console.log(`
Usage: device-frames <screenshot> --device <id> [options]

Options:
  --device, -d       Device ID (required)
  --orientation, -r  portrait | landscape (default: portrait)
  --output, -o       Output file path (default: framed-<input>)
  --format, -f       png | jpeg | webp (default: png)
  --quality, -q      Output quality for jpeg/webp (default: 90)
  --list             List available devices
  --help, -h         Show this help message

Examples:
  device-frames screenshot.png --device iphone-16-pro
  device-frames screenshot.png -d "iPhone 16 Pro" -o mockup.png
  device-frames screenshot.png -d galaxy-s24-ultra --orientation landscape
`)
}

function parseArgs(argv: string[]): {
  input?: string
  device?: string
  orientation: Orientation
  output?: string
  format: "png" | "jpeg" | "webp"
  quality: number
  list: boolean
  help: boolean
} {
  const result = {
    input: undefined as string | undefined,
    device: undefined as string | undefined,
    orientation: "portrait" as Orientation,
    output: undefined as string | undefined,
    format: "png" as "png" | "jpeg" | "webp",
    quality: 90,
    list: false,
    help: false,
  }

  const args = argv.slice(2)
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === "--help" || arg === "-h") {
      result.help = true
    } else if (arg === "--list") {
      result.list = true
    } else if (arg === "--device" || arg === "-d") {
      result.device = args[++i]
    } else if (arg === "--orientation" || arg === "-r") {
      const val = args[++i]
      if (val === "portrait" || val === "landscape") {
        result.orientation = val
      } else {
        console.error(`Invalid orientation: ${val}`)
        process.exit(1)
      }
    } else if (arg === "--output" || arg === "-o") {
      result.output = args[++i]
    } else if (arg === "--format" || arg === "-f") {
      const val = args[++i]
      if (val === "png" || val === "jpeg" || val === "webp") {
        result.format = val
      } else {
        console.error(`Invalid format: ${val}`)
        process.exit(1)
      }
    } else if (arg === "--quality" || arg === "-q") {
      result.quality = parseInt(args[++i], 10)
    } else if (!arg.startsWith("-")) {
      result.input = arg
    }

    i++
  }

  return result
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  if (args.help) {
    printUsage()
    process.exit(0)
  }

  if (args.list) {
    const devices = listDevices()
    console.log("Available devices:\n")
    for (const d of devices) {
      console.log(
        `  ${d.id.padEnd(22)} ${d.name.padEnd(20)} ${d.displayResolution[0]}x${d.displayResolution[1]}`
      )
    }
    process.exit(0)
  }

  if (!args.input) {
    console.error("Error: No screenshot file specified.")
    printUsage()
    process.exit(1)
  }

  if (!args.device) {
    console.error("Error: --device is required.")
    printUsage()
    process.exit(1)
  }

  const inputPath = path.resolve(args.input)
  const outputPath = args.output
    ? path.resolve(args.output)
    : path.join(
        path.dirname(inputPath),
        `framed-${path.basename(inputPath, path.extname(inputPath))}.${args.format}`
      )

  try {
    const buffer = await frameScreenshot(inputPath, {
      device: args.device,
      orientation: args.orientation,
      format: args.format,
      quality: args.quality,
    })

    await fs.writeFile(outputPath, buffer)
    console.log(`Wrote ${outputPath}`)
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}

main()
