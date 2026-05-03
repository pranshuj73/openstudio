export interface ZoomSegment {
  id: string;
  startTime: number;
  endTime: number;
  scale: number;
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
