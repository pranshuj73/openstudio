'use client';

import { useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useEditorStore } from '@/store/editorStore';
import { getVideo } from '@/lib/videoRegistry';
import { exportToMp4, type ExportProgress } from '@/lib/exportEngine';

const FPS_OPTIONS = [24, 30, 60] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDialog({ open, onOpenChange }: Props) {
  const clips = useEditorStore((s) => s.clips);
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isExporting = progress !== null;

  const handleExport = useCallback(async () => {
    const video = getVideo();
    if (!video || !clips.length) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ phase: 'capturing', framesRendered: 0, totalFrames: 0, percent: 0 });

    try {
      const blob = await exportToMp4(video, clips, fps, setProgress, controller.signal);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openstudio-export-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // cancelled — stay open
      } else {
        console.error('Export failed:', err);
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }, [clips, fps, onOpenChange]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleOpenChange = (val: boolean) => {
    if (isExporting) return; // block closing while exporting
    onOpenChange(val);
  };

  const phaseLabel = () => {
    if (!progress) return '';
    if (progress.phase === 'encoding') return 'Finalising…';
    return `Capturing frame ${progress.framesRendered} / ${progress.totalFrames} (${Math.round(progress.percent)}%)`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-80 font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-semibold">export</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* FPS */}
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-2">
              frame rate
            </p>
            <div className="flex gap-1.5">
              {FPS_OPTIONS.map((f) => (
                <Button
                  key={f}
                  variant={fps === f ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-3 font-mono flex-1"
                  disabled={isExporting}
                  onClick={() => setFps(f)}
                >
                  {f} fps
                </Button>
              ))}
            </div>
          </div>

          {/* Resolution info */}
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>resolution</span>
            <span>1280 × 720</span>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <Progress value={progress.percent} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground tabular-nums">{phaseLabel()}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isExporting ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs font-mono"
                onClick={handleCancel}
              >
                cancel
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs font-mono"
                  onClick={() => onOpenChange(false)}
                >
                  close
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5 font-mono"
                  disabled={!clips.length}
                  onClick={handleExport}
                >
                  <Download className="w-3 h-3" />
                  export mp4
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
