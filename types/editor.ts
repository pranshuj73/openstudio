export interface ZoomKeyframe {
  id: string;
  time: number; // absolute video time in seconds
  scale: number; // 1.0 = no zoom
  x: number; // 0–1 normalized focus point
  y: number; // 0–1 normalized focus point
}

export interface Background {
  type: 'color' | 'gradient';
  color: string;
  gradientTo?: string;
}

export interface Frame {
  enabled: boolean;
  color: string;
  width: number; // px at 1280×720
}

export interface Clip {
  id: string;
  sourceStart: number; // seconds in source video
  sourceEnd: number;
  speed: number; // 1 = normal
  background: Background;
  padding: number; // 0–20 percent
  frame: Frame;
  zoomKeyframes: ZoomKeyframe[];
}
