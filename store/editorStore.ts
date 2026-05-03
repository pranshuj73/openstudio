import { create } from 'zustand';
import type { Clip, ZoomSegment } from '@/types/editor';

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

  loadVideo: (file: File, duration: number, w: number, h: number) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  selectClip: (id: string | null) => void;
  updateClip: (id: string, updates: Partial<Omit<Clip, 'id'>>) => void;
  splitAtTime: (time: number) => void;
  setThumbnails: (thumbs: string[]) => void;
  addZoomSegment: (clipId: string, seg: Omit<ZoomSegment, 'id'>) => void;
  removeZoomSegment: (clipId: string, segId: string) => void;
  updateZoomSegment: (
    clipId: string,
    segId: string,
    updates: Partial<Omit<ZoomSegment, 'id'>>
  ) => void;
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

  loadVideo: (file, duration, w, h) => {
    const old = get().videoUrl;
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(file);
    const clip: Clip = {
      id: crypto.randomUUID(),
      sourceStart: 0,
      sourceEnd: duration,
      speed: 1,
      background: { type: 'color', color: '#111111' },
      padding: 8,
      frame: { enabled: false, color: '#ffffff', width: 2 },
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
    });
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  selectClip: (id) => set({ selectedClipId: id }),
  setThumbnails: (thumbs) => set({ thumbnails: thumbs }),

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
        .map((s) => ({ ...s, endTime: Math.min(s.endTime, time) })),
    };
    const b: Clip = {
      ...orig,
      id: crypto.randomUUID(),
      sourceStart: time,
      zoomSegments: orig.zoomSegments
        .filter((s) => s.endTime > time)
        .map((s) => ({ ...s, startTime: Math.max(s.startTime, time) })),
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
                { ...seg, id: crypto.randomUUID() },
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
}));
