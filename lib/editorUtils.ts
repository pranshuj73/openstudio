import type { ZoomSegment, PanKeyframe, Clip } from '@/types/editor';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Catmull-Rom spline: smooth curve through all keyframes using neighboring tangents
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  );
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
      const t = (time - sorted[i].time) / (sorted[i + 1].time - sorted[i].time);
      // Phantom points: clamp neighbors at the ends for natural tangents
      const p0 = sorted[Math.max(0, i - 1)];
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      const p3 = sorted[Math.min(sorted.length - 1, i + 2)];
      return {
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
      };
    }
  }

  return { x: 0.5, y: 0.5 };
}

export interface OutputSegment {
  clip: Clip;
  outputStart: number;
  outputEnd: number;
}

export function buildOutputTimeline(clips: Clip[]): OutputSegment[] {
  let offset = 0;
  return clips.map((clip) => {
    const duration = (clip.sourceEnd - clip.sourceStart) / clip.speed;
    const seg: OutputSegment = { clip, outputStart: offset, outputEnd: offset + duration };
    offset += duration;
    return seg;
  });
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`;
}
