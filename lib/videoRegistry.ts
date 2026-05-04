/**
 * Module-level singleton holding the active HTMLVideoElement from PreviewCanvas.
 * Used by the export engine to access the video without prop drilling.
 */
let videoEl: HTMLVideoElement | null = null;

export function registerVideo(el: HTMLVideoElement | null) {
  videoEl = el;
}

export function getVideo(): HTMLVideoElement | null {
  return videoEl;
}
