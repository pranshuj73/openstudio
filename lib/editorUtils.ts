import type { ZoomSegment } from '@/types/editor';

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function getZoomForTime(time: number, segments: ZoomSegment[]): number {
  const seg = segments.find((s) => time >= s.startTime && time <= s.endTime);
  if (!seg) return 1;

  const duration = seg.endTime - seg.startTime;
  if (duration <= 0) return seg.scale;

  const easeTime = Math.min(duration * 0.25, 0.5);
  const elapsed = time - seg.startTime;

  if (elapsed < easeTime) {
    return 1 + (seg.scale - 1) * easeInOut(elapsed / easeTime);
  }
  if (elapsed > duration - easeTime) {
    return 1 + (seg.scale - 1) * easeInOut((duration - elapsed) / easeTime);
  }
  return seg.scale;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`;
}
