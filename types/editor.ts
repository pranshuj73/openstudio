export interface PanKeyframe {
  id: string;
  time: number;
  x: number; // 0–1: normalized horizontal center of frame
  y: number; // 0–1: normalized vertical center of frame
}

export interface ZoomSegment {
  id: string;
  startTime: number;
  endTime: number;
  scale: number;
  panKeyframes: PanKeyframe[];
}

export interface Background {
  type: 'color' | 'gradient' | 'image';
  color: string;
  gradientTo?: string;
  imageUrl?: string;
}

export interface Frame {
  enabled: boolean;
  color: string;
  width: number;
  opacity: number; // 0–1
  radius: number;  // px
}

export interface Clip {
  id: string;
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  background: Background;
  padding: number;
  frame: Frame;
  zoomSegments: ZoomSegment[];
}
