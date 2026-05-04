import type { Clip } from '@/types/editor';
import { getZoomForTime, getPanForTime } from './editorUtils';

const W = 1280;
const H = 720;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function ensureBgImages(
  clips: Clip[],
  cache: Map<string, HTMLImageElement>
): Promise<void> {
  const urls = clips
    .filter((c) => c.background.type === 'image' && c.background.imageUrl)
    .map((c) => c.background.imageUrl!);
  await Promise.all(
    urls.map(async (url) => {
      if (!cache.has(url)) cache.set(url, await loadImage(url));
    })
  );
}

export function renderFrameToCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  clip: Clip,
  sourceTime: number,
  bgImageCache: Map<string, HTMLImageElement>
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  if (clip.background.type === 'image' && clip.background.imageUrl) {
    const img = bgImageCache.get(clip.background.imageUrl);
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

  const t = sourceTime;
  const activeSeg = clip.zoomSegments.find((s) => t >= s.startTime && t <= s.endTime);
  const zoom = getZoomForTime(t, clip.zoomSegments);
  const pan = activeSeg ? getPanForTime(t, activeSeg.panKeyframes) : { x: 0.5, y: 0.5 };

  ctx.save();
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

  if (clip.frame.enabled) {
    ctx.save();
    ctx.globalAlpha = clip.frame.opacity ?? 1;
    ctx.strokeStyle = clip.frame.color;
    ctx.lineWidth = clip.frame.width;
    const hw = clip.frame.width / 2;
    ctx.beginPath();
    ctx.roundRect(drawX - hw, drawY - hw, drawW + hw * 2, drawH + hw * 2, r > 0 ? r + hw : 0);
    ctx.stroke();
    ctx.restore();
  }
}
