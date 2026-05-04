import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { Clip } from '@/types/editor';
import { buildOutputTimeline } from './editorUtils';
import { renderFrameToCanvas, ensureBgImages } from './renderFrameToCanvas';

export interface ExportProgress {
  phase: 'loading' | 'capturing' | 'encoding';
  framesRendered: number;
  totalFrames: number;
  percent: number;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Seek timeout')), 8000);
    const onSeeked = () => {
      clearTimeout(timeout);
      resolve();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = time;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.85
    );
  });
}

function padded(n: number) {
  return String(n).padStart(6, '0');
}

export async function exportToMp4(
  video: HTMLVideoElement,
  clips: Clip[],
  fps: number,
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  // Pre-load background images
  const bgImageCache = new Map<string, HTMLImageElement>();
  await ensureBgImages(clips, bgImageCache);

  const timeline = buildOutputTimeline(clips);
  const totalOutputDuration = timeline.at(-1)?.outputEnd ?? 0;
  const totalFrames = Math.ceil(totalOutputDuration * fps);

  // Load FFmpeg
  onProgress({ phase: 'loading', framesRendered: 0, totalFrames, percent: 0 });
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
    wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
    workerURL: await toBlobURL('/ffmpeg/ffmpeg-core.worker.js', 'text/javascript'),
  });

  // Offscreen canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;

  // Pause playback during export
  const wasPlaying = !video.paused;
  video.pause();
  const prevTime = video.currentTime;
  video.playbackRate = 1;

  try {
    // Frame capture loop
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');

      const tOut = i / fps;
      const seg = timeline.find((s) => tOut >= s.outputStart && tOut < s.outputEnd)
        ?? timeline[timeline.length - 1];
      const tSource = seg.clip.sourceStart + (tOut - seg.outputStart) * seg.clip.speed;

      await seekTo(video, tSource);
      renderFrameToCanvas(canvas, video, seg.clip, tSource, bgImageCache);

      const blob = await canvasToBlob(canvas);
      await ffmpeg.writeFile(`frame${padded(i)}.jpg`, await fetchFile(blob));

      const percent = ((i + 1) / totalFrames) * 85;
      onProgress({ phase: 'capturing', framesRendered: i + 1, totalFrames, percent });
    }

    // Encode
    onProgress({ phase: 'encoding', framesRendered: totalFrames, totalFrames, percent: 85 });
    ffmpeg.on('progress', ({ progress }) => {
      onProgress({
        phase: 'encoding',
        framesRendered: totalFrames,
        totalFrames,
        percent: 85 + progress * 15,
      });
    });

    await ffmpeg.exec([
      '-framerate', String(fps),
      '-i', `frame%06d.jpg`,
      '-vf', `fps=${fps},format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-movflags', '+faststart',
      'output.mp4',
    ]);

    const raw = await ffmpeg.readFile('output.mp4');
    const data = raw instanceof Uint8Array ? raw : new TextEncoder().encode(raw as string);

    // Clean up WASM FS
    await ffmpeg.deleteFile('output.mp4');
    for (let i = 0; i < totalFrames; i++) {
      await ffmpeg.deleteFile(`frame${padded(i)}.jpg`);
    }

    return new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' });
  } finally {
    // Restore video state
    video.currentTime = prevTime;
    if (wasPlaying) video.play().catch(() => {});
  }
}
