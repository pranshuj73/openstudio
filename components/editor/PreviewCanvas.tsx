'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { getZoomAtTime } from '@/lib/editorUtils';

const W = 1280;
const H = 720;

export default function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  const videoUrl = useEditorStore((s) => s.videoUrl);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  // Reads fresh state on every call — no stale closures
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { clips, currentTime: t } = useEditorStore.getState();
    const clip =
      clips.find((c) => t >= c.sourceStart && t <= c.sourceEnd) ?? clips[0];

    if (!clip) {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // Background
    if (clip.background.type === 'gradient' && clip.background.gradientTo) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, clip.background.color);
      grad.addColorStop(1, clip.background.gradientTo);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = clip.background.color;
    }
    ctx.fillRect(0, 0, W, H);

    if (video.readyState < 2) return;

    // Padded rect
    const padX = (clip.padding / 100) * W;
    const padY = (clip.padding / 100) * H;
    const rectW = W - padX * 2;
    const rectH = H - padY * 2;

    // Maintain video aspect ratio
    const videoAR = video.videoWidth / video.videoHeight || 16 / 9;
    const rectAR = rectW / rectH;

    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (videoAR > rectAR) {
      drawW = rectW;
      drawH = rectW / videoAR;
      drawX = padX;
      drawY = padY + (rectH - drawH) / 2;
    } else {
      drawH = rectH;
      drawW = rectH * videoAR;
      drawX = padX + (rectW - drawW) / 2;
      drawY = padY;
    }

    // Zoom interpolation
    const zoom = getZoomAtTime(t, clip.zoomKeyframes);
    ctx.save();
    const cx = drawX + drawW * zoom.x;
    const cy = drawY + drawH * zoom.y;
    ctx.translate(cx, cy);
    ctx.scale(zoom.scale, zoom.scale);
    ctx.translate(-cx, -cy);
    ctx.drawImage(video, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Frame overlay
    if (clip.frame.enabled) {
      ctx.strokeStyle = clip.frame.color;
      ctx.lineWidth = clip.frame.width;
      ctx.strokeRect(drawX, drawY, drawW, drawH);
    }
  }, []);

  // Play / pause video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

  // Keep playback rate in sync with clip speed
  useEffect(() => {
    return useEditorStore.subscribe((state) => {
      const video = videoRef.current;
      if (!video) return;
      const clip =
        state.clips.find(
          (c) =>
            state.currentTime >= c.sourceStart &&
            state.currentTime <= c.sourceEnd
        ) ?? state.clips[0];
      if (clip) video.playbackRate = clip.speed;
    });
  }, []);

  // RAF loop while playing
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const loop = () => {
      const video = videoRef.current;
      if (video) {
        setCurrentTime(video.currentTime);
        if (video.ended) {
          setPlaying(false);
          return;
        }
      }
      renderFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, renderFrame, setCurrentTime, setPlaying]);

  // Seek + render when scrubbing (paused)
  useEffect(() => {
    if (isPlaying) return;
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - currentTime) > 0.02) {
      video.currentTime = currentTime;
      video.addEventListener('seeked', () => renderFrame(), { once: true });
    } else {
      renderFrame();
    }
  }, [currentTime, isPlaying, renderFrame]);

  // Re-render immediately when clip settings change (background, padding, etc.)
  useEffect(() => {
    let prev = useEditorStore.getState().clips;
    return useEditorStore.subscribe((state) => {
      if (state.clips !== prev && !state.isPlaying) {
        prev = state.clips;
        renderFrame();
      }
    });
  }, [renderFrame]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
      <video
        ref={videoRef}
        src={videoUrl ?? undefined}
        className="hidden"
        muted
        playsInline
        preload="auto"
      />
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="max-w-full max-h-full"
        style={{ aspectRatio: `${W}/${H}` }}
      />
    </div>
  );
}
