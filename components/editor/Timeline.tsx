'use client';

import { useCallback, useRef, useState } from 'react';
import { ZoomIn, X, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useEditorStore } from '@/store/editorStore';
import { formatTime } from '@/lib/editorUtils';
import type { ZoomSegment } from '@/types/editor';

type DragState =
  | { type: 'none' }
  | { type: 'move'; segId: string; clipId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'left'; segId: string; clipId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'right'; segId: string; clipId: string; startX: number; origStart: number; origEnd: number };

const SCALE_PRESETS = [1.5, 2, 2.5, 3];

export default function Timeline() {
  const currentTime = useEditorStore((s) => s.currentTime);
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const thumbnails = useEditorStore((s) => s.thumbnails);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const selectClip = useEditorStore((s) => s.selectClip);
  const splitAtTime = useEditorStore((s) => s.splitAtTime);
  const addZoomSegment = useEditorStore((s) => s.addZoomSegment);
  const removeZoomSegment = useEditorStore((s) => s.removeZoomSegment);
  const updateZoomSegment = useEditorStore((s) => s.updateZoomSegment);
  const addPanKeyframe = useEditorStore((s) => s.addPanKeyframe);
  const removePanKeyframe = useEditorStore((s) => s.removePanKeyframe);
  const updatePanKeyframe = useEditorStore((s) => s.updatePanKeyframe);

  // trackRef is used for both scrubbing AND zoom segment time calculations
  const trackRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);
  const dragRef = useRef<DragState>({ type: 'none' });
  const [activeSegId, setActiveSegId] = useState<string | null>(null);

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // --- Scrub ---
  const timeFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current || !videoDuration) return null;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return (x / rect.width) * videoDuration;
    },
    [videoDuration]
  );

  const applySeek = useCallback(
    (clientX: number) => {
      const t = timeFromPointer(clientX);
      if (t === null) return;
      setCurrentTime(t);
      const hit = useEditorStore.getState().clips.find(
        (c) => t >= c.sourceStart && t <= c.sourceEnd
      );
      if (hit) selectClip(hit.id);
    },
    [timeFromPointer, setCurrentTime, selectClip]
  );

  // --- Zoom segment drag ---
  const startSegDrag = (
    e: React.PointerEvent,
    seg: ZoomSegment,
    clipId: string,
    mode: 'move' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    trackRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { type: mode, segId: seg.id, clipId, startX: e.clientX, origStart: seg.startTime, origEnd: seg.endTime };
  };

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;

    if (drag.type !== 'none') {
      // Zoom segment drag takes priority
      const tNow = timeFromPointer(e.clientX);
      const tStart = timeFromPointer(drag.startX);
      if (tNow === null || tStart === null) return;
      const dt = tNow - tStart;
      const clip = useEditorStore.getState().clips.find((c) => c.id === drag.clipId);
      if (!clip) return;

      if (drag.type === 'move') {
        const dur = drag.origEnd - drag.origStart;
        const ns = Math.max(clip.sourceStart, Math.min(drag.origStart + dt, clip.sourceEnd - dur));
        updateZoomSegment(drag.clipId, drag.segId, { startTime: ns, endTime: ns + dur });
      } else if (drag.type === 'left') {
        const ns = Math.max(clip.sourceStart, Math.min(drag.origStart + dt, drag.origEnd - 0.2));
        updateZoomSegment(drag.clipId, drag.segId, { startTime: ns });
      } else if (drag.type === 'right') {
        const ne = Math.max(drag.origStart + 0.2, Math.min(drag.origEnd + dt, clip.sourceEnd));
        updateZoomSegment(drag.clipId, drag.segId, { endTime: ne });
      }
    } else if (isScrubbing.current) {
      applySeek(e.clientX);
    }
  };

  const handleTrackPointerUp = () => {
    dragRef.current = { type: 'none' };
    isScrubbing.current = false;
  };

  const addZoomAtPlayhead = () => {
    if (!selectedClip || !videoDuration) return;
    const half = Math.min(2, (selectedClip.sourceEnd - selectedClip.sourceStart) / 4);
    const start = Math.max(selectedClip.sourceStart, currentTime - half);
    const end = Math.min(selectedClip.sourceEnd, currentTime + half);
    addZoomSegment(selectedClip.id, { startTime: start, endTime: end, scale: 2 });
  };

  const rulerMarks = () => {
    if (!videoDuration) return [];
    const step = videoDuration <= 15 ? 1 : videoDuration <= 60 ? 5 : videoDuration <= 300 ? 10 : 30;
    const marks: number[] = [];
    for (let t = 0; t <= videoDuration; t += step) marks.push(t);
    return marks;
  };

  const pct = (t: number) => `${(t / videoDuration) * 100}%`;
  const playheadPct = videoDuration ? (currentTime / videoDuration) * 100 : 0;

  const activeSeg = selectedClip?.zoomSegments.find((s) => s.id === activeSegId);
  const inActiveSeg =
    activeSeg !== undefined &&
    currentTime >= activeSeg.startTime &&
    currentTime <= activeSeg.endTime;

  return (
    <div className="bg-background border-t border-border shrink-0 flex flex-col select-none" style={{ height: 232 }}>

      {/* Tool panel */}
      <div className="h-10 border-b border-border flex items-center px-3 gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 font-mono"
          disabled={!videoDuration}
          onClick={() => splitAtTime(currentTime)}
        >
          <Scissors className="w-3 h-3" />
          cut
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 font-mono"
          disabled={!selectedClip}
          onClick={addZoomAtPlayhead}
        >
          <ZoomIn className="w-3 h-3" />
          zoom
        </Button>
        {selectedClip && selectedClip.zoomSegments.length > 0 && (
          <span className="font-mono text-[9px] text-muted-foreground/50 ml-1">
            {selectedClip.zoomSegments.length} region{selectedClip.zoomSegments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Zoom segment settings (shown when a segment is active) */}
      {activeSeg && selectedClip && (
        <div className="border-b border-border bg-muted/10 shrink-0 px-3 py-2 space-y-2">
          {/* Scale row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] text-muted-foreground/50 shrink-0">
              {formatTime(activeSeg.startTime)} → {formatTime(activeSeg.endTime)}
            </span>
            <div className="flex gap-1">
              {SCALE_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateZoomSegment(selectedClip.id, activeSeg.id, { scale: s })}
                  className={`font-mono text-[9px] px-1.5 py-0.5 border ${
                    activeSeg.scale === s
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-24 max-w-36">
              <Slider
                min={1.1} max={4} step={0.1}
                value={[activeSeg.scale]}
                onValueChange={([v]) => updateZoomSegment(selectedClip.id, activeSeg.id, { scale: +v.toFixed(1) })}
              />
              <span className="font-mono text-[9px] text-muted-foreground w-6 shrink-0">{activeSeg.scale.toFixed(1)}x</span>
            </div>
            <button
              onClick={() => updateZoomSegment(selectedClip.id, activeSeg.id, { startTime: selectedClip.sourceStart, endTime: selectedClip.sourceEnd })}
              className="font-mono text-[9px] px-2 py-0.5 border border-border text-muted-foreground hover:border-foreground/40"
            >
              throughout
            </button>
            <Button variant="ghost" size="icon" className="w-5 h-5 ml-auto shrink-0"
              onClick={() => { removeZoomSegment(selectedClip.id, activeSeg.id); setActiveSegId(null); }}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Pan keyframes */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-wider">camera path</span>
              <button
                disabled={!inActiveSeg}
                onClick={() => addPanKeyframe(selectedClip.id, activeSeg.id, { time: currentTime, x: 0.5, y: 0.5 })}
                className="ml-auto font-mono text-[9px] px-2 py-0.5 border border-border text-muted-foreground hover:border-foreground/40 disabled:opacity-30"
              >
                + kf at playhead
              </button>
            </div>
            {activeSeg.panKeyframes.length === 0 ? (
              <p className="font-mono text-[9px] text-muted-foreground/30">
                add keyframes to animate camera position while zoomed in
              </p>
            ) : (
              activeSeg.panKeyframes.map((kf) => (
                <div key={kf.id} className="flex items-center gap-1.5">
                  <span className="font-mono text-[8px] text-muted-foreground/50 w-10 shrink-0">{formatTime(kf.time)}</span>
                  <span className="font-mono text-[8px] text-muted-foreground/50">x</span>
                  <Slider min={0} max={1} step={0.01} value={[kf.x]}
                    onValueChange={([v]) => updatePanKeyframe(selectedClip.id, activeSeg.id, kf.id, { x: v })}
                    className="flex-1" />
                  <span className="font-mono text-[8px] text-muted-foreground/50 w-6 text-right">{kf.x.toFixed(2)}</span>
                  <span className="font-mono text-[8px] text-muted-foreground/50">y</span>
                  <Slider min={0} max={1} step={0.01} value={[kf.y]}
                    onValueChange={([v]) => updatePanKeyframe(selectedClip.id, activeSeg.id, kf.id, { y: v })}
                    className="flex-1" />
                  <span className="font-mono text-[8px] text-muted-foreground/50 w-6 text-right">{kf.y.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="w-4 h-4 shrink-0"
                    onClick={() => removePanKeyframe(selectedClip.id, activeSeg.id, kf.id)}>
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Scrub area: ruler + clip track (zoom segments overlay here) */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-col-resize overflow-hidden"
        onPointerDown={(e) => {
          // Only start scrubbing if we didn't hit a zoom segment
          if (dragRef.current.type === 'none') {
            isScrubbing.current = true;
            setPlaying(false);
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            applySeek(e.clientX);
          }
        }}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
      >
        {/* Ruler */}
        <div className="h-5 border-b border-border relative pointer-events-none">
          {rulerMarks().map((t) => (
            <div key={t} className="absolute top-0 flex flex-col items-start" style={{ left: pct(t) }}>
              <div className="w-px h-2 bg-border" />
              <span className="font-mono text-[8px] text-muted-foreground leading-none mt-0.5 pl-0.5">{formatTime(t)}</span>
            </div>
          ))}
        </div>

        {/* Clip track */}
        <div className="relative" style={{ height: 80 }}>
          {/* Clip blocks */}
          {clips.map((clip, i) => {
            if (!videoDuration) return null;
            const selected = clip.id === selectedClipId;
            return (
              <div
                key={clip.id}
                className={`absolute top-1.5 bottom-1.5 border overflow-hidden ${selected ? 'border-foreground/50' : 'border-foreground/20'}`}
                style={{ left: pct(clip.sourceStart), width: `${((clip.sourceEnd - clip.sourceStart) / videoDuration) * 100}%` }}
              >
                {thumbnails.length > 0 && (
                  <div className="absolute inset-0 flex overflow-hidden">
                    {thumbnails.map((thumb, ti) => (
                      <img key={ti} src={thumb} alt="" className="h-full w-auto object-cover shrink-0 opacity-40" draggable={false} />
                    ))}
                  </div>
                )}
                <div className="absolute inset-0 flex items-end px-1.5 pb-1 pointer-events-none">
                  <span className="font-mono text-[8px] text-white/70 bg-black/40 px-1">
                    {i + 1}{clip.speed !== 1 ? ` · ${clip.speed}x` : ''}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Zoom segments — translucent blue overlays on top of clips */}
          {selectedClip?.zoomSegments.map((seg) => {
            const isActive = activeSegId === seg.id;
            const left = pct(seg.startTime);
            const width = `${((seg.endTime - seg.startTime) / videoDuration) * 100}%`;
            return (
              <div
                key={seg.id}
                className={`absolute top-1 bottom-1 z-10 cursor-grab active:cursor-grabbing overflow-hidden transition-colors group ${
                  isActive
                    ? 'bg-blue-500/35 border border-blue-400/70'
                    : 'bg-blue-500/15 border border-blue-500/35 hover:bg-blue-500/28 hover:border-blue-400/55'
                }`}
                style={{ left, width }}
                onClick={() => setActiveSegId(isActive ? null : seg.id)}
                onPointerDown={(e) => {
                  setActiveSegId(seg.id);
                  startSegDrag(e, seg, selectedClip.id, 'move');
                }}
              >
                {/* Left resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300/20"
                  onPointerDown={(e) => { e.stopPropagation(); startSegDrag(e, seg, selectedClip.id, 'left'); }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] text-blue-200/70 pointer-events-none">
                  {seg.scale}x
                </span>
                {/* Pan keyframe tick marks */}
                {seg.panKeyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="absolute top-0 bottom-0 w-px bg-blue-200/60 pointer-events-none"
                    style={{ left: `${((kf.time - seg.startTime) / (seg.endTime - seg.startTime)) * 100}%` }}
                  />
                ))}
                {/* Right resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300/20"
                  onPointerDown={(e) => { e.stopPropagation(); startSegDrag(e, seg, selectedClip.id, 'right'); }}
                />
              </div>
            );
          })}

          {!videoDuration && <div className="absolute inset-2 border border-dashed border-border" />}
        </div>

        {/* Playhead */}
        {videoDuration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground z-20 pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="w-2 h-2 bg-foreground absolute top-0 -translate-x-[3px]" />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="h-5 border-t border-border flex items-center px-4 gap-4 shrink-0">
        <span className="font-mono text-[9px] text-muted-foreground">
          {clips.length} clip{clips.length !== 1 ? 's' : ''}
        </span>
        {videoDuration > 0 && (
          <span className="font-mono text-[9px] text-muted-foreground">{formatTime(videoDuration)}</span>
        )}
      </div>
    </div>
  );
}
