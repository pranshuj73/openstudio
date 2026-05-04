'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { getZoomForTime, getPanForTime } from '@/lib/editorUtils';
import { registerVideo } from '@/lib/videoRegistry';

const W = 1280;
const H = 720;

export default function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const bgImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const videoUrl = useEditorStore((s) => s.videoUrl);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  const getOrLoadBgImage = useCallback(
    (url: string): HTMLImageElement | null => {
      if (bgImageCache.current.has(url)) return bgImageCache.current.get(url)!;
      const img = new Image();
      img.onload = () => {
        bgImageCache.current.set(url, img);
        if (!useEditorStore.getState().isPlaying) renderFrame();
      };
      img.src = url;
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
    if (clip.background.type === 'image' && clip.background.imageUrl) {
      const img = getOrLoadBgImage(clip.background.imageUrl);
      if (img) {
        const imgAR = img.naturalWidth / img.naturalHeight;
        const canvasAR = W / H;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (imgAR > canvasAR) {
          sw = img.naturalHeight * canvasAR;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / canvasAR;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);
      }
    } else if (clip.background.type === 'gradient' && clip.background.gradientTo) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, clip.background.color);
      grad.addColorStop(1, clip.background.gradientTo);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = clip.background.color;
      ctx.fillRect(0, 0, W, H);
    }

    if (video.readyState < 2) return;

    // Padded draw rect
    const padX = (clip.padding / 100) * W;
    const padY = (clip.padding / 100) * H;
    const rectW = W - padX * 2;
    const rectH = H - padY * 2;

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

    const activeSeg = clip.zoomSegments.find((s) => t >= s.startTime && t <= s.endTime);
    const zoom = getZoomForTime(t, clip.zoomSegments);
    const pan = activeSeg ? getPanForTime(t, activeSeg.panKeyframes) : { x: 0.5, y: 0.5 };

    ctx.save();
    // Clip to video rect so zoom never overflows into padding/background
    const r = clip.frame.radius ?? 0;
    ctx.beginPath();
    if (r > 0) {
      ctx.roundRect(drawX, drawY, drawW, drawH, r);
    } else {
      ctx.rect(drawX, drawY, drawW, drawH);
    }
    ctx.clip();

    const cx = drawX + drawW * pan.x;
    const cy = drawY + drawH * pan.y;
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    ctx.drawImage(video, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Frame overlay (drawn outside the clipping path)
    if (clip.frame.enabled) {
      ctx.save();
      ctx.globalAlpha = clip.frame.opacity ?? 1;
      ctx.strokeStyle = clip.frame.color;
      ctx.lineWidth = clip.frame.width;
      // Expand outward by half lineWidth so the inner edge is flush with the video
      const hw = clip.frame.width / 2;
      const r = clip.frame.radius ?? 0;
      ctx.beginPath();
      ctx.roundRect(drawX - hw, drawY - hw, drawW + hw * 2, drawH + hw * 2, r > 0 ? r + hw : 0);
      ctx.stroke();
      ctx.restore();
    }
  }, [getOrLoadBgImage]);

  useEffect(() => {
    registerVideo(videoRef.current);
    return () => registerVideo(null);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

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
    <div className="w-full h-full flex items-center justify-center bg-[#020208]">
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
