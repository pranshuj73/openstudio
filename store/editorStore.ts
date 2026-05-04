import { create } from 'zustand';
import type { Clip, ZoomSegment, PanKeyframe } from '@/types/editor';

export type SidebarPanel =
  | { type: 'clip' }
  | { type: 'zoom'; segId: string };

interface EditorStore {
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number;
  videoNativeWidth: number;
  videoNativeHeight: number;
  currentTime: number;
  isPlaying: boolean;
  clips: Clip[];
  selectedClipId: string | null;
  thumbnails: string[];
  sidebarPanel: SidebarPanel;

  loadVideo: (file: File, duration: number, w: number, h: number) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  selectClip: (id: string | null) => void;
  updateClip: (id: string, updates: Partial<Omit<Clip, 'id'>>) => void;
  splitAtTime: (time: number) => void;
  setThumbnails: (thumbs: string[]) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;

  // Zoom segments
  addZoomSegment: (clipId: string, seg: Omit<ZoomSegment, 'id' | 'panKeyframes'>) => void;
  removeZoomSegment: (clipId: string, segId: string) => void;
  updateZoomSegment: (clipId: string, segId: string, updates: Partial<Omit<ZoomSegment, 'id' | 'panKeyframes'>>) => void;

  // Pan keyframes
  addPanKeyframe: (clipId: string, segId: string, kf: { time: number; x?: number; y?: number }) => void;
  removePanKeyframe: (clipId: string, segId: string, kfId: string) => void;
  updatePanKeyframe: (clipId: string, segId: string, kfId: string, updates: Partial<Omit<PanKeyframe, 'id'>>) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  videoNativeWidth: 0,
  videoNativeHeight: 0,
  currentTime: 0,
  isPlaying: false,
  clips: [],
  selectedClipId: null,
  thumbnails: [],
  sidebarPanel: { type: 'clip' },

  loadVideo: (file, duration, w, h) => {
    const old = get().videoUrl;
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(file);
    const clip: Clip = {
      id: crypto.randomUUID(),
      sourceStart: 0,
      sourceEnd: duration,
      speed: 1,
      background: { type: 'gradient', color: '#0f0c29', gradientTo: '#302b63' },
      padding: 8,
      frame: { enabled: false, color: '#ffffff', width: 2, opacity: 0.25, radius: 0 },
      zoomSegments: [],
    };
    set({
      videoFile: file,
      videoUrl: url,
      videoDuration: duration,
      videoNativeWidth: w,
      videoNativeHeight: h,
      clips: [clip],
      selectedClipId: clip.id,
      currentTime: 0,
      isPlaying: false,
      thumbnails: [],
      sidebarPanel: { type: 'clip' },
    });
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  selectClip: (id) => set({ selectedClipId: id }),
  setThumbnails: (thumbs) => set({ thumbnails: thumbs }),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),

  updateClip: (id, updates) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  splitAtTime: (time) => {
    const { clips } = get();
    const idx = clips.findIndex(
      (c) => time > c.sourceStart && time < c.sourceEnd
    );
    if (idx === -1) return;
    const orig = clips[idx];
    const a: Clip = {
      ...orig,
      id: crypto.randomUUID(),
      sourceEnd: time,
      zoomSegments: orig.zoomSegments
        .filter((s) => s.startTime < time)
        .map((s) => ({
          ...s,
          endTime: Math.min(s.endTime, time),
          panKeyframes: s.panKeyframes.filter((kf) => kf.time <= time),
        })),
    };
    const b: Clip = {
      ...orig,
      id: crypto.randomUUID(),
      sourceStart: time,
      zoomSegments: orig.zoomSegments
        .filter((s) => s.endTime > time)
        .map((s) => ({
          ...s,
          startTime: Math.max(s.startTime, time),
          panKeyframes: s.panKeyframes.filter((kf) => kf.time >= time),
        })),
    };
    const next = [...clips];
    next.splice(idx, 1, a, b);
    set({ clips: next, selectedClipId: a.id });
  },

  addZoomSegment: (clipId, seg) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomSegments: [
                ...c.zoomSegments,
                { ...seg, id: crypto.randomUUID(), panKeyframes: [] },
              ].sort((a, b) => a.startTime - b.startTime),
            }
          : c
      ),
    })),

  removeZoomSegment: (clipId, segId) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? { ...c, zoomSegments: c.zoomSegments.filter((s) => s.id !== segId) }
          : c
      ),
    })),

  updateZoomSegment: (clipId, segId, updates) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomSegments: c.zoomSegments.map((s) =>
                s.id === segId ? { ...s, ...updates } : s
              ),
            }
          : c
      ),
    })),

  addPanKeyframe: (clipId, segId, kf) =>
    set((s) => ({
      clips: s.clips.map((c) => {
        if (c.id !== clipId) return c;
        return {
          ...c,
          zoomSegments: c.zoomSegments.map((seg) => {
            if (seg.id !== segId) return seg;
            // Inherit x/y from the most recent keyframe before this time
            const prev = [...seg.panKeyframes]
              .sort((a, b) => a.time - b.time)
              .filter((k) => k.time < kf.time)
              .at(-1);
            const x = kf.x ?? prev?.x ?? 0.5;
            const y = kf.y ?? prev?.y ?? 0.5;
            return {
              ...seg,
              panKeyframes: [
                ...seg.panKeyframes,
                { time: kf.time, x, y, id: crypto.randomUUID() },
              ].sort((a, b) => a.time - b.time),
            };
          }),
        };
      }),
    })),

  removePanKeyframe: (clipId, segId, kfId) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomSegments: c.zoomSegments.map((seg) =>
                seg.id === segId
                  ? {
                      ...seg,
                      panKeyframes: seg.panKeyframes.filter((kf) => kf.id !== kfId),
                    }
                  : seg
              ),
            }
          : c
      ),
    })),

  updatePanKeyframe: (clipId, segId, kfId, updates) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomSegments: c.zoomSegments.map((seg) =>
                seg.id === segId
                  ? {
                      ...seg,
                      panKeyframes: seg.panKeyframes.map((kf) =>
                        kf.id === kfId ? { ...kf, ...updates } : kf
                      ),
                    }
                  : seg
              ),
            }
          : c
      ),
    })),
}));
