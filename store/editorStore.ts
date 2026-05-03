import { create } from 'zustand';
import type { Clip, ZoomKeyframe } from '@/types/editor';

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

  loadVideo: (file: File, duration: number, w: number, h: number) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  selectClip: (id: string | null) => void;
  updateClip: (id: string, updates: Partial<Omit<Clip, 'id'>>) => void;
  splitAtTime: (time: number) => void;
  addZoomKeyframe: (clipId: string, kf: Omit<ZoomKeyframe, 'id'>) => void;
  removeZoomKeyframe: (clipId: string, kfId: string) => void;
  updateZoomKeyframe: (
    clipId: string,
    kfId: string,
    updates: Partial<Omit<ZoomKeyframe, 'id'>>
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
      zoomKeyframes: [],
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
    });
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  selectClip: (id) => set({ selectedClipId: id }),

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
      zoomKeyframes: orig.zoomKeyframes.filter((kf) => kf.time < time),
    };
    const b: Clip = {
      ...orig,
      id: crypto.randomUUID(),
      sourceStart: time,
      zoomKeyframes: orig.zoomKeyframes.filter((kf) => kf.time >= time),
    };
    const next = [...clips];
    next.splice(idx, 1, a, b);
    set({ clips: next, selectedClipId: a.id });
  },

  addZoomKeyframe: (clipId, kf) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomKeyframes: [
                ...c.zoomKeyframes,
                { ...kf, id: crypto.randomUUID() },
              ].sort((a, b) => a.time - b.time),
            }
          : c
      ),
    })),

  removeZoomKeyframe: (clipId, kfId) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomKeyframes: c.zoomKeyframes.filter((kf) => kf.id !== kfId),
            }
          : c
      ),
    })),

  updateZoomKeyframe: (clipId, kfId, updates) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              zoomKeyframes: c.zoomKeyframes.map((kf) =>
                kf.id === kfId ? { ...kf, ...updates } : kf
              ),
            }
          : c
      ),
    })),
}));
