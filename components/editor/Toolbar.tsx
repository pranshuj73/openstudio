'use client';

import { useState } from 'react';
import { Play, Pause, Download, Expand, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { formatTime } from '@/lib/editorUtils';
import ExportDialog from './ExportDialog';

export default function Toolbar() {
  const [exportOpen, setExportOpen] = useState(false);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const videoUrl = useEditorStore((s) => s.videoUrl);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);

  return (
    <div className="h-12 flex items-center px-4">
      {/* Brand */}
      <div className="flex items-center gap-2 w-44 shrink-0">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/30 to-indigo-600/20 border border-violet-500/25 flex items-center justify-center shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-violet-400 to-indigo-500" />
        </div>
        <span className="font-mono text-sm font-semibold tracking-tight select-none">
          openstudio
        </span>
      </div>

      {/* Transport — centered */}
      <div className="flex-1 flex items-center justify-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          disabled={!videoUrl}
          onClick={() => {
            setPlaying(false);
            setCurrentTime(Math.max(0, currentTime - 0.1));
          }}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 mx-0.5"
          disabled={!videoUrl}
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          disabled={!videoUrl}
          onClick={() => {
            setPlaying(false);
            setCurrentTime(Math.min(videoDuration, currentTime + 0.1));
          }}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </Button>
        <div className="ml-3 px-2.5 py-1 bg-muted rounded-md border border-primary/20">
          <span className="font-mono text-xs tabular-nums select-none text-muted-foreground">
            {formatTime(currentTime)}&thinsp;/&thinsp;{formatTime(videoDuration)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 w-44 justify-end shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          disabled={!videoUrl}
          onClick={() => document.getElementById('preview-area')?.requestFullscreen()}
        >
          <Expand className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="gap-1.5 font-mono"
          disabled={!videoUrl}
          onClick={() => setExportOpen(true)}
        >
          <Download className="w-3.5 h-3.5" />
          export
        </Button>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
