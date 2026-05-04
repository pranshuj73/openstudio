import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } from 'mediabunny';
import type { Clip } from '@/types/editor';
import { buildOutputTimeline } from './editorUtils';
import { renderFrameToCanvas, ensureBgImages } from './renderFrameToCanvas';

export interface ExportProgress {
  phase: 'capturing' | 'encoding';
  framesRendered: number;
  totalFrames: number;
  percent: number;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Seek timeout')), 8000);
    video.addEventListener('seeked', () => { clearTimeout(timeout); resolve(); }, { once: true });
    video.currentTime = time;
  });
}

export async function exportToMp4(
  video: HTMLVideoElement,
  clips: Clip[],
  fps: number,
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const bgImageCache = new Map<string, HTMLImageElement>();
  await ensureBgImages(clips, bgImageCache);

  const timeline = buildOutputTimeline(clips);
  const totalOutputDuration = timeline.at(-1)?.outputEnd ?? 0;
  const totalFrames = Math.ceil(totalOutputDuration * fps);

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1920;
  canvas.height = video.videoHeight || 1080;

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const videoSource = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: fps });

  await output.start();

  const wasPlaying = !video.paused;
  video.pause();
  const prevTime = video.currentTime;
  video.playbackRate = 1;

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');

      const tOut = i / fps;
      const seg = timeline.find((s) => tOut >= s.outputStart && tOut < s.outputEnd)
        ?? timeline[timeline.length - 1];
      const tSource = seg.clip.sourceStart + (tOut - seg.outputStart) * seg.clip.speed;

      await seekTo(video, tSource);
      renderFrameToCanvas(canvas, video, seg.clip, tSource, bgImageCache);
      await videoSource.add(tOut, 1 / fps);

      onProgress({ phase: 'capturing', framesRendered: i + 1, totalFrames, percent: ((i + 1) / totalFrames) * 100 });
    }

    videoSource.close(); // signal completion so output can plan ahead during finalize
    onProgress({ phase: 'encoding', framesRendered: totalFrames, totalFrames, percent: 100 });
    await output.finalize();

    return new Blob([target.buffer!], { type: 'video/mp4' });
  } finally {
    video.currentTime = prevTime;
    if (wasPlaying) video.play().catch(() => {});
  }
}
