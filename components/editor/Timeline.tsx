'use client';

import { useCallback, useRef, useState } from 'react';
import { ZoomIn, X } from 'lucide-react';
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
  const addZoomSegment = useEditorStore((s) => s.addZoomSegment);
  const removeZoomSegment = useEditorStore((s) => s.removeZoomSegment);
  const updateZoomSegment = useEditorStore((s) => s.updateZoomSegment);

  const scrubAreaRef = useRef<HTMLDivElement>(null);
  const zoomRowRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);
  const dragRef = useRef<DragState>({ type: 'none' });
  const [activeSegId, setActiveSegId] = useState<string | null>(null);

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // --- Scrub helpers ---
  const timeFromScrubPointer = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubAreaRef.current || !videoDuration) return null;
      const rect = scrubAreaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      return (x / rect.width) * videoDuration;
    },
    [videoDuration]
  );

  const applySeek = useCallback(
    (e: React.PointerEvent) => {
      const t = timeFromScrubPointer(e);
      if (t === null) return;
      setCurrentTime(t);
      const hit = useEditorStore.getState().clips.find(
        (c) => t >= c.sourceStart && t <= c.sourceEnd
      );
      if (hit) selectClip(hit.id);
    },
    [timeFromScrubPointer, setCurrentTime, selectClip]
  );

  // --- Zoom drag helpers ---
  const timeFromZoomPointer = useCallback(
    (clientX: number) => {
      if (!zoomRowRef.current || !videoDuration) return null;
      const rect = zoomRowRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return (x / rect.width) * videoDuration;
    },
    [videoDuration]
  );

  const handleZoomSegPointerDown = (
    e: React.PointerEvent,
    seg: ZoomSegment,
    clipId: string,
    mode: 'move' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    zoomRowRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: mode,
      segId: seg.id,
      clipId,
      startX: e.clientX,
      origStart: seg.startTime,
      origEnd: seg.endTime,
    };
  };

  const handleZoomPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.type === 'none') return;

    const tAtPointer = timeFromZoomPointer(e.clientX);
    const tAtStart = timeFromZoomPointer(drag.startX);
    if (tAtPointer === null || tAtStart === null) return;

    const dt = tAtPointer - tAtStart;
    const clip = useEditorStore.getState().clips.find((c) => c.id === drag.clipId);
    if (!clip) return;

    if (drag.type === 'move') {
      const duration = drag.origEnd - drag.origStart;
      const newStart = Math.max(clip.sourceStart, Math.min(drag.origStart + dt, clip.sourceEnd - duration));
      updateZoomSegment(drag.clipId, drag.segId, {
        startTime: newStart,
        endTime: newStart + duration,
      });
    } else if (drag.type === 'left') {
      const newStart = Math.max(clip.sourceStart, Math.min(drag.origStart + dt, drag.origEnd - 0.2));
      updateZoomSegment(drag.clipId, drag.segId, { startTime: newStart });
    } else if (drag.type === 'right') {
      const newEnd = Math.max(drag.origStart + 0.2, Math.min(drag.origEnd + dt, clip.sourceEnd));
      updateZoomSegment(drag.clipId, drag.segId, { endTime: newEnd });
    }
  };

  const handleZoomPointerUp = () => {
    dragRef.current = { type: 'none' };
  };

  const addZoomAtPlayhead = () => {
    if (!selectedClip || !videoDuration) return;
    const half = Math.min(2, (selectedClip.sourceEnd - selectedClip.sourceStart) / 4);
    const start = Math.max(selectedClip.sourceStart, currentTime - half);
    const end = Math.min(selectedClip.sourceEnd, currentTime + half);
    addZoomSegment(selectedClip.id, { startTime: start, endTime: end, scale: 2 });
  };

  // Ruler marks
  const rulerMarks = () => {
    if (!videoDuration) return [];
    const step =
      videoDuration <= 15 ? 1 : videoDuration <= 60 ? 5 : videoDuration <= 300 ? 10 : 30;
    const marks: number[] = [];
    for (let t = 0; t <= videoDuration; t += step) marks.push(t);
    return marks;
  };

  const pct = (t: number) => `${(t / videoDuration) * 100}%`;
  const playheadPct = videoDuration ? (currentTime / videoDuration) * 100 : 0;

  return (
    <div className="bg-background border-t border-border shrink-0 flex flex-col select-none" style={{ height: 176 }}>

      {/* Zoom row header */}
      <div className="h-7 border-b border-border flex items-center px-2 gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[10px] gap-1 font-mono px-2"
          disabled={!selectedClip}
          onClick={addZoomAtPlayhead}
        >
          <ZoomIn className="w-3 h-3" />
          zoom
        </Button>
        <div className="text-[9px] font-mono text-muted-foreground/40">
          {selectedClip
            ? `${selectedClip.zoomSegments.length} zoom region${selectedClip.zoomSegments.length !== 1 ? 's' : ''}`
            : 'select a clip to add zoom'}
        </div>
      </div>

      {/* Zoom segments row */}
      <div
        ref={zoomRowRef}
        className="h-8 border-b border-border relative shrink-0 overflow-hidden"
        onPointerMove={handleZoomPointerMove}
        onPointerUp={handleZoomPointerUp}
      >
        {selectedClip?.zoomSegments.map((seg) => {
          const left = pct(seg.startTime);
          const width = `${((seg.endTime - seg.startTime) / videoDuration) * 100}%`;
          const isActive = activeSegId === seg.id;

          return (
            <div
              key={seg.id}
              className={`absolute top-1 bottom-1 cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden ${
                isActive
                  ? 'bg-white/25 border border-white/60'
                  : 'bg-white/10 border border-white/30 hover:bg-white/20'
              }`}
              style={{ left, width }}
              onClick={() => setActiveSegId(isActive ? null : seg.id)}
              onPointerDown={(e) =>
                handleZoomSegPointerDown(e, seg, selectedClip.id, 'move')
              }
            >
              {/* Left resize handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleZoomSegPointerDown(e, seg, selectedClip.id, 'left');
                }}
              />
              <span className="font-mono text-[8px] text-white/70 pointer-events-none">
                {seg.scale}x
              </span>
              {/* Right resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleZoomSegPointerDown(e, seg, selectedClip.id, 'right');
                }}
              />
            </div>
          );
        })}

        {!videoDuration && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[9px] text-muted-foreground/30">
              zoom regions appear here
            </span>
          </div>
        )}
      </div>

      {/* Zoom segment settings (inline panel when a segment is active) */}
      {activeSegId && selectedClip && (() => {
        const seg = selectedClip.zoomSegments.find((s) => s.id === activeSegId);
        if (!seg) return null;
        return (
          <div className="h-9 border-b border-border bg-muted/30 flex items-center gap-4 px-3 shrink-0">
            <span className="font-mono text-[9px] text-muted-foreground shrink-0">
              {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
            </span>
            <div className="flex gap-1">
              {SCALE_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateZoomSegment(selectedClip.id, seg.id, { scale: s })}
                  className={`font-mono text-[9px] px-1.5 py-0.5 border ${
                    seg.scale === s
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-32">
              <Slider
                min={1.1}
                max={4}
                step={0.1}
                value={[seg.scale]}
                onValueChange={([v]) =>
                  updateZoomSegment(selectedClip.id, seg.id, { scale: +v.toFixed(1) })
                }
                className="flex-1"
              />
              <span className="font-mono text-[9px] text-muted-foreground w-7 shrink-0">
                {seg.scale.toFixed(1)}x
              </span>
            </div>
            <button
              onClick={() => {
                updateZoomSegment(selectedClip.id, seg.id, {
                  startTime: selectedClip.sourceStart,
                  endTime: selectedClip.sourceEnd,
                });
              }}
              className="font-mono text-[9px] px-2 py-0.5 border border-border text-muted-foreground hover:border-foreground/40"
            >
              throughout
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 ml-auto"
              onClick={() => {
                removeZoomSegment(selectedClip.id, seg.id);
                setActiveSegId(null);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        );
      })()}

      {/* Scrub area: ruler + clips */}
      <div
        ref={scrubAreaRef}
        className="relative flex-1 cursor-col-resize overflow-hidden"
        onPointerDown={(e) => {
          isScrubbing.current = true;
          setPlaying(false);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          applySeek(e);
        }}
        onPointerMove={(e) => { if (isScrubbing.current) applySeek(e); }}
        onPointerUp={() => { isScrubbing.current = false; }}
      >
        {/* Ruler */}
        <div className="h-5 border-b border-border relative">
          {rulerMarks().map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-start"
              style={{ left: pct(t) }}
            >
              <div className="w-px h-2 bg-border" />
              <span className="font-mono text-[8px] text-muted-foreground leading-none mt-0.5 pl-0.5">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>

        {/* Clip track */}
        <div className="relative" style={{ height: 56 }}>
          {clips.map((clip, i) => {
            if (!videoDuration) return null;
            const left = pct(clip.sourceStart);
            const width = `${((clip.sourceEnd - clip.sourceStart) / videoDuration) * 100}%`;
            const selected = clip.id === selectedClipId;

            return (
              <div
                key={clip.id}
                className={`absolute top-1.5 bottom-1.5 border overflow-hidden ${
                  selected
                    ? 'border-foreground/50'
                    : 'border-foreground/20'
                }`}
                style={{ left, width }}
              >
                {/* Thumbnail strip */}
                {thumbnails.length > 0 && (
                  <div className="absolute inset-0 flex overflow-hidden">
                    {thumbnails.map((thumb, ti) => (
                      <img
                        key={ti}
                        src={thumb}
                        alt=""
                        className="h-full w-auto object-cover shrink-0 opacity-40"
                        draggable={false}
                      />
                    ))}
                  </div>
                )}
                {/* Clip label overlay */}
                <div className="absolute inset-0 flex items-end px-1.5 pb-1 pointer-events-none">
                  <span className="font-mono text-[8px] text-white/70 bg-black/40 px-1">
                    {i + 1}{clip.speed !== 1 ? ` · ${clip.speed}x` : ''}
                  </span>
                </div>
              </div>
            );
          })}

          {!videoDuration && (
            <div className="absolute inset-2 border border-dashed border-border" />
          )}
        </div>

        {/* Playhead */}
        {videoDuration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground z-10 pointer-events-none"
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
          <span className="font-mono text-[9px] text-muted-foreground">
            {formatTime(videoDuration)}
          </span>
        )}
      </div>
    </div>
  );
}
