'use client';

import { useCallback, useRef } from 'react';
import { ZoomIn, Scissors, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { formatTime } from '@/lib/editorUtils';
import type { ZoomSegment } from '@/types/editor';

type DragState =
  | { type: 'none' }
  | { type: 'move'; segId: string; clipId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'left'; segId: string; clipId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'right'; segId: string; clipId: string; startX: number; origStart: number; origEnd: number };

export default function Timeline() {
  const currentTime = useEditorStore((s) => s.currentTime);
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const thumbnails = useEditorStore((s) => s.thumbnails);
  const sidebarPanel = useEditorStore((s) => s.sidebarPanel);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const selectClip = useEditorStore((s) => s.selectClip);
  const splitAtTime = useEditorStore((s) => s.splitAtTime);
  const addZoomSegment = useEditorStore((s) => s.addZoomSegment);
  const updateZoomSegment = useEditorStore((s) => s.updateZoomSegment);
  const setSidebarPanel = useEditorStore((s) => s.setSidebarPanel);

  const trackRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);
  const dragRef = useRef<DragState>({ type: 'none' });

  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const activeSegId = sidebarPanel.type === 'zoom' ? sidebarPanel.segId : null;

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

  const startSegDrag = (
    e: React.PointerEvent,
    seg: ZoomSegment,
    clipId: string,
    mode: 'move' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    trackRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: mode,
      segId: seg.id,
      clipId,
      startX: e.clientX,
      origStart: seg.startTime,
      origEnd: seg.endTime,
    };
  };

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.type !== 'none') {
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

  const addZoomAtPlayhead = () => {
    if (!selectedClip || !videoDuration) return;
    const half = Math.min(2, (selectedClip.sourceEnd - selectedClip.sourceStart) / 4);
    const start = Math.max(selectedClip.sourceStart, currentTime - half);
    const end = Math.min(selectedClip.sourceEnd, currentTime + half);
    addZoomSegment(selectedClip.id, { startTime: start, endTime: end, scale: 2 });
  };

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
    <div className="flex flex-col select-none h-full">

      {/* Tool bar */}
      <div className="h-10 border-b border-border bg-gradient-to-r from-primary/6 to-transparent flex items-center px-2.5 gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 font-mono text-xs h-7 px-2.5"
          disabled={!videoDuration}
          onClick={() => splitAtTime(currentTime)}
        >
          <Scissors className="w-3 h-3" />
          cut
        </Button>
        <div className="w-px h-3.5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 font-mono text-xs h-7 px-2.5"
          disabled={!selectedClip}
          onClick={addZoomAtPlayhead}
        >
          <ZoomIn className="w-3 h-3" />
          zoom
        </Button>
        {selectedClip && selectedClip.zoomSegments.length > 0 && (
          <span className="text-[10px] text-muted-foreground ml-1 font-mono">
            {selectedClip.zoomSegments.length}&nbsp;region{selectedClip.zoomSegments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Scrub area */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-col-resize overflow-hidden flex flex-col"
        onPointerDown={(e) => {
          if (dragRef.current.type === 'none') {
            isScrubbing.current = true;
            setPlaying(false);
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            applySeek(e.clientX);
          }
        }}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={() => {
          dragRef.current = { type: 'none' };
          isScrubbing.current = false;
        }}
      >
        {/* Ruler */}
        <div className="h-5 border-b border-border relative pointer-events-none bg-background/60">
          {rulerMarks().map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-start"
              style={{ left: pct(t) }}
            >
              <div className="w-px h-1.5 bg-border/60" />
              <span className="font-mono text-[8px] text-muted-foreground/60 leading-none mt-0.5 pl-0.5">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>

        {/* Clip track */}
        <div className="relative flex-1">
          {clips.map((clip, i) => {
            if (!videoDuration) return null;
            const selected = clip.id === selectedClipId;
            return (
              <div
                key={clip.id}
                className={`absolute top-2 bottom-2 rounded overflow-hidden border transition-colors ${selected
                    ? 'border-primary/50 ring-1 ring-primary/20 ring-offset-0'
                    : 'border-border/60'
                  }`}
                style={{
                  left: pct(clip.sourceStart),
                  width: `${((clip.sourceEnd - clip.sourceStart) / videoDuration) * 100}%`,
                }}
              >
                {thumbnails.length > 0 && (
                  <div className="absolute inset-0 flex overflow-hidden">
                    {thumbnails.map((thumb, ti) => (
                      <img
                        key={ti}
                        src={thumb}
                        alt=""
                        className="h-full w-auto object-cover shrink-0 opacity-30"
                        draggable={false}
                      />
                    ))}
                  </div>
                )}
                <div className="absolute inset-0 flex items-end px-2 pb-1.5 pointer-events-none">
                  <span className="font-mono text-[8px] bg-background/60 text-foreground/70 px-1 py-px rounded">
                    {i + 1}{clip.speed !== 1 ? ` · ${clip.speed}x` : ''}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Zoom segment overlays */}
          {selectedClip?.zoomSegments.map((seg) => {
            const isActive = activeSegId === seg.id;
            return (
              <div
                key={seg.id}
                className={`absolute top-1 bottom-1 z-10 cursor-grab active:cursor-grabbing rounded transition-colors ${isActive
                    ? 'bg-primary/25 border border-primary/50'
                    : 'bg-primary/10 border border-primary/25 hover:bg-primary/20'
                  }`}
                style={{
                  left: pct(seg.startTime),
                  width: `${((seg.endTime - seg.startTime) / videoDuration) * 100}%`,
                }}
                onClick={() =>
                  setSidebarPanel(isActive ? { type: 'clip' } : { type: 'zoom', segId: seg.id })
                }
                onPointerDown={(e) => {
                  setSidebarPanel({ type: 'zoom', segId: seg.id });
                  startSegDrag(e, seg, selectedClip.id, 'move');
                }}
              >
                <div
                  className='absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-primary rounded py-2 cursor-ew-resize'
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startSegDrag(e, seg, selectedClip.id, 'left');
                  }}
                >
                  <GripVertical size={12} />
                </div>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-primary/80 pointer-events-none font-medium">
                  {seg.scale}x
                </span>
                {seg.panKeyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="absolute top-1 bottom-1 w-px bg-primary/50 pointer-events-none"
                    style={{
                      left: `${((kf.time - seg.startTime) / (seg.endTime - seg.startTime)) * 100}%`,
                    }}
                  />
                ))}
                <div
                  className='absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-primary rounded py-2 cursor-ew-resize'
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startSegDrag(e, seg, selectedClip.id, 'right');
                  }}
                >
                  <GripVertical size={12} />
                </div>
              </div>
            );
          })}

          {!videoDuration && (
            <div className="absolute inset-3 border border-dashed border-border/40 rounded" />
          )}
        </div>

        {/* Playhead */}
        {videoDuration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/80 z-20 pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-primary absolute top-0.5 -translate-x-0.75" />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-border flex items-center px-3 gap-4 shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {clips.length}&nbsp;clip{clips.length !== 1 ? 's' : ''}
        </span>
        {videoDuration > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
            {formatTime(videoDuration)}
          </span>
        )}
      </div>
    </div>
  );
}
