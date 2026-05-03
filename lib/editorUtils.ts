import type { ZoomSegment, PanKeyframe } from '@/types/editor';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

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

export function getPanForTime(
  time: number,
  keyframes: PanKeyframe[]
): { x: number; y: number } {
  if (keyframes.length === 0) return { x: 0.5, y: 0.5 };

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return { x: sorted[0].x, y: sorted[0].y };

  const last = sorted[sorted.length - 1];
  if (time >= last.time) return { x: last.x, y: last.y };

  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      const t = easeInOut(
        (time - sorted[i].time) / (sorted[i + 1].time - sorted[i].time)
      );
      return {
        x: lerp(sorted[i].x, sorted[i + 1].x, t),
        y: lerp(sorted[i].y, sorted[i + 1].y, t),
      };
    }
  }

  return { x: 0.5, y: 0.5 };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`;
}
