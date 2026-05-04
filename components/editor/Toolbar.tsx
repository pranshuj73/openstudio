'use client';

import { Play, Pause, Download, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { formatTime } from '@/lib/editorUtils';

export default function Toolbar() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const videoUrl = useEditorStore((s) => s.videoUrl);

  return (
    <div className="h-11 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
      <span className="font-mono text-sm font-semibold tracking-tight select-none">
        openstudio
      </span>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          disabled={!videoUrl}
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </Button>
        <span className="font-mono text-xs text-muted-foreground tabular-nums select-none w-32 text-center">
          {formatTime(currentTime)}&nbsp;/&nbsp;{formatTime(videoDuration)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          disabled={!videoUrl}
          onClick={() => document.getElementById('preview-area')?.requestFullscreen()}
        >
          <Expand className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1.5 font-mono" disabled>
          <Download className="w-3 h-3" />
          export
        </Button>
      </div>
    </div>
  );
}
