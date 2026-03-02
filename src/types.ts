export interface DeviceMockupConfig {
  id: string
  name: string
  displayResolution: [number, number]
  frameWidth: number
  frameHeight: number
  screenCoords: {
    portrait: [[number, number], [number, number], [number, number], [number, number]]
    landscape: [[number, number], [number, number], [number, number], [number, number]]
  }
  frameFile?: string
}

export type Orientation = "portrait" | "landscape"

export interface FrameOptions {
  device: string
  orientation?: Orientation
  format?: "png" | "jpeg" | "webp"
  quality?: number
}

export interface FrameResult {
  buffer: Buffer
  width: number
  height: number
}
