'use client';

import { useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { formatTime } from '@/lib/editorUtils';

export default function Timeline() {
  const currentTime = useEditorStore((s) => s.currentTime);
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const selectClip = useEditorStore((s) => s.selectClip);

  const containerRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);

  const timeFromPointer = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current || !videoDuration) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      return (x / rect.width) * videoDuration;
    },
    [videoDuration]
  );

  const applySeek = useCallback(
    (e: React.PointerEvent) => {
      const t = timeFromPointer(e);
      if (t === null) return;
      setCurrentTime(t);
      // Auto-select clip at this time
      const { clips } = useEditorStore.getState();
      const hit = clips.find((c) => t >= c.sourceStart && t <= c.sourceEnd);
      if (hit) selectClip(hit.id);
    },
    [timeFromPointer, setCurrentTime, selectClip]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isScrubbing.current = true;
    setPlaying(false);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    applySeek(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing.current) return;
    applySeek(e);
  };

  const handlePointerUp = () => {
    isScrubbing.current = false;
  };

  // Ruler tick marks
  const rulerMarks = () => {
    if (!videoDuration) return [];
    const step =
      videoDuration <= 15 ? 1 : videoDuration <= 60 ? 5 : videoDuration <= 300 ? 10 : 30;
    const marks: number[] = [];
    for (let t = 0; t <= videoDuration; t += step) marks.push(t);
    return marks;
  };

  const playheadPct = videoDuration ? (currentTime / videoDuration) * 100 : 0;

  return (
    <div className="bg-background border-t border-border shrink-0 flex flex-col" style={{ height: 144 }}>
      {/* Scrub area: ruler + clip track */}
      <div
        ref={containerRef}
        className="relative flex-1 cursor-col-resize select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Ruler */}
        <div className="h-6 border-b border-border relative">
          {rulerMarks().map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-start"
              style={{ left: `${(t / videoDuration) * 100}%` }}
            >
              <div className="w-px h-2 bg-border" />
              <span className="font-mono text-[9px] text-muted-foreground leading-none mt-0.5 pl-0.5">
                {formatTime(t)}
              </span>
            </div>
          ))}
          {!videoDuration && (
            <span className="absolute inset-0 flex items-center px-3 font-mono text-[10px] text-muted-foreground/40">
              no video loaded
            </span>
          )}
        </div>

        {/* Clip track */}
        <div className="relative flex-1" style={{ height: 72 }}>
          {clips.map((clip, i) => {
            if (!videoDuration) return null;
            const left = (clip.sourceStart / videoDuration) * 100;
            const width = ((clip.sourceEnd - clip.sourceStart) / videoDuration) * 100;
            const selected = clip.id === selectedClipId;
            return (
              <div
                key={clip.id}
                className={`absolute top-2 bottom-2 border overflow-hidden ${
                  selected
                    ? 'bg-foreground/20 border-foreground/50'
                    : 'bg-foreground/8 border-foreground/20'
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                <span className="font-mono text-[9px] text-foreground/50 px-1.5 pt-1 block truncate">
                  {i + 1}
                  {clip.speed !== 1 ? ` · ${clip.speed}x` : ''}
                </span>

                {/* Zoom keyframe diamonds */}
                {clip.zoomKeyframes.map((kf) => {
                  const kfPct =
                    ((kf.time - clip.sourceStart) /
                      (clip.sourceEnd - clip.sourceStart)) *
                    100;
                  return (
                    <div
                      key={kf.id}
                      className="absolute bottom-2 w-2 h-2 bg-foreground rotate-45 -translate-x-1"
                      style={{ left: `${kfPct}%` }}
                      title={`${kf.scale.toFixed(1)}x at ${formatTime(kf.time)}`}
                    />
                  );
                })}
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
      <div className="h-6 border-t border-border flex items-center px-4 gap-4 shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground">
          {clips.length} clip{clips.length !== 1 ? 's' : ''}
        </span>
        {videoDuration > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {formatTime(videoDuration)} total
          </span>
        )}
      </div>
    </div>
  );
}
