'use client';

import { useRef } from 'react';
import { ImageIcon, Plus, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useEditorStore } from '@/store/editorStore';
import { formatTime } from '@/lib/editorUtils';
import type { Background } from '@/types/editor';

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 4];
const SCALE_PRESETS = [1.5, 2, 2.5, 3];

const BG_PRESETS: Background[] = [
  { type: 'color', color: '#000000' },
  { type: 'color', color: '#111111' },
  { type: 'color', color: '#1c1c1e' },
  { type: 'color', color: '#ffffff' },
  { type: 'gradient', color: '#0f0c29', gradientTo: '#302b63' },
  { type: 'gradient', color: '#1a1a2e', gradientTo: '#16213e' },
  { type: 'gradient', color: '#0f2027', gradientTo: '#203a43' },
  { type: 'gradient', color: '#200122', gradientTo: '#6f0000' },
  { type: 'gradient', color: '#0d0d0d', gradientTo: '#1a1a2e' },
  { type: 'gradient', color: '#16213e', gradientTo: '#0f3460' },
];

function bgMatch(a: Background, b: Background) {
  return a.type === b.type && a.color === b.color && a.gradientTo === b.gradientTo;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2.5 font-mono">
      {children}
    </p>
  );
}

// ─── Zoom panel ────────────────────────────────────────────────────────────
function ZoomPanel({ clipId, segId }: { clipId: string; segId: string }) {
  const clips = useEditorStore((s) => s.clips);
  const currentTime = useEditorStore((s) => s.currentTime);
  const setSidebarPanel = useEditorStore((s) => s.setSidebarPanel);
  const updateZoomSegment = useEditorStore((s) => s.updateZoomSegment);
  const removeZoomSegment = useEditorStore((s) => s.removeZoomSegment);
  const addPanKeyframe = useEditorStore((s) => s.addPanKeyframe);
  const removePanKeyframe = useEditorStore((s) => s.removePanKeyframe);
  const updatePanKeyframe = useEditorStore((s) => s.updatePanKeyframe);

  const clip = clips.find((c) => c.id === clipId);
  const seg = clip?.zoomSegments.find((s) => s.id === segId);

  if (!clip || !seg) {
    setSidebarPanel({ type: 'clip' });
    return null;
  }

  const inSeg = currentTime >= seg.startTime && currentTime <= seg.endTime;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => setSidebarPanel({ type: 'clip' })}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          clip
        </button>
        <span className="text-muted-foreground">·</span>
        <span className="text-sm font-medium font-mono">zoom</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">

          <div>
            <SectionLabel>scale</SectionLabel>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {SCALE_PRESETS.map((s) => (
                <Button
                  key={s}
                  variant={seg.scale === s ? 'default' : 'outline'}
                  size="sm"
                  className="font-mono flex-1"
                  onClick={() => updateZoomSegment(clipId, segId, { scale: s })}
                >
                  {s}x
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Slider
                min={1.1} max={4} step={0.1}
                value={[seg.scale]}
                onValueChange={([v]) => updateZoomSegment(clipId, segId, { scale: +v.toFixed(1) })}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-10 text-right shrink-0 font-mono">
                {seg.scale.toFixed(1)}x
              </span>
            </div>
          </div>

          <Separator />

          <div>
            <SectionLabel>duration</SectionLabel>
            <Button
              variant="outline"
              size="sm"
              className="w-full font-mono"
              onClick={() => updateZoomSegment(clipId, segId, { startTime: clip.sourceStart, endTime: clip.sourceEnd })}
            >
              throughout clip
            </Button>
          </div>

          <Separator />

          <div>
            <SectionLabel>camera path</SectionLabel>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 mb-3 font-mono"
              disabled={!inSeg}
              onClick={() => addPanKeyframe(clipId, segId, { time: currentTime })}
            >
              <Plus className="w-3.5 h-3.5" />
              add keyframe at playhead
            </Button>

            {seg.panKeyframes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3 font-mono">
                add keyframes to pan while zoomed
              </p>
            ) : (
              <div className="space-y-2">
                {seg.panKeyframes.map((kf) => (
                  <div key={kf.id} className="bg-muted rounded-lg px-3 py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatTime(kf.time)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => removePanKeyframe(clipId, segId, kf.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block font-mono">
                        x — {kf.x.toFixed(2)}
                      </Label>
                      <Slider min={0} max={1} step={0.01} value={[kf.x]}
                        onValueChange={([v]) => updatePanKeyframe(clipId, segId, kf.id, { x: v })} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block font-mono">
                        y — {kf.y.toFixed(2)}
                      </Label>
                      <Slider min={0} max={1} step={0.01} value={[kf.y]}
                        onValueChange={([v]) => updatePanKeyframe(clipId, segId, kf.id, { y: v })} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            className="w-full font-mono"
            onClick={() => { removeZoomSegment(clipId, segId); setSidebarPanel({ type: 'clip' }); }}
          >
            delete zoom region
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Clip panel ────────────────────────────────────────────────────────────
function ClipPanel({ clipId }: { clipId: string }) {
  const clips = useEditorStore((s) => s.clips);
  const updateClip = useEditorStore((s) => s.updateClip);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return null;

  const handleBgImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateClip(clip.id, { background: { type: 'image', color: '#000000', imageUrl: e.target?.result as string } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 space-y-5">

      <div>
        <SectionLabel>background</SectionLabel>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {BG_PRESETS.map((preset, i) => {
            const active = bgMatch(clip.background, preset);
            return (
              <button
                key={i}
                className={`w-7 h-7 rounded-md shrink-0 transition-all border ${
                  active ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-foreground/50'
                }`}
                style={
                  preset.type === 'gradient'
                    ? { background: `linear-gradient(135deg, ${preset.color}, ${preset.gradientTo})` }
                    : { background: preset.color }
                }
                onClick={() => updateClip(clip.id, { background: preset })}
              />
            );
          })}
          <input
            type="color"
            value={clip.background.color}
            onChange={(e) => updateClip(clip.id, { background: { type: 'color', color: e.target.value } })}
            className="w-7 h-7 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
            title="custom color"
          />
        </div>

        <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgImageUpload(f); e.target.value = ''; }} />
        <Button variant="outline" size="sm" className="w-full gap-1.5 font-mono mb-2"
          onClick={() => bgImageInputRef.current?.click()}>
          <ImageIcon className="w-3.5 h-3.5" />
          {clip.background.type === 'image' ? 'change image' : 'use image'}
        </Button>

        {clip.background.type === 'image' && clip.background.imageUrl && (
          <div className="relative rounded-md overflow-hidden" style={{ height: 60 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clip.background.imageUrl} alt="background" className="w-full h-full object-cover" />
            <Button variant="secondary" size="sm"
              className="absolute top-1.5 right-1.5 h-6 text-xs font-mono"
              onClick={() => updateClip(clip.id, { background: { type: 'color', color: '#111111' } })}>
              remove
            </Button>
          </div>
        )}

        {clip.background.type === 'gradient' && (
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block font-mono">from</Label>
              <input type="color" value={clip.background.color}
                onChange={(e) => updateClip(clip.id, { background: { ...clip.background, color: e.target.value } })}
                className="w-full h-8 rounded-md border border-border cursor-pointer block bg-transparent p-0.5" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block font-mono">to</Label>
              <input type="color" value={clip.background.gradientTo ?? '#000000'}
                onChange={(e) => updateClip(clip.id, { background: { ...clip.background, gradientTo: e.target.value } })}
                className="w-full h-8 rounded-md border border-border cursor-pointer block bg-transparent p-0.5" />
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <SectionLabel>padding</SectionLabel>
        <div className="flex items-center gap-3">
          <Slider min={0} max={20} step={0.5} value={[clip.padding]}
            onValueChange={([v]) => updateClip(clip.id, { padding: v })} className="flex-1" />
          <span className="text-sm text-muted-foreground w-10 text-right shrink-0 font-mono">{clip.padding}%</span>
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>frame</SectionLabel>
          <Switch checked={clip.frame.enabled}
            onCheckedChange={(v) => updateClip(clip.id, { frame: { ...clip.frame, enabled: v } })} />
        </div>
        <div className={`space-y-3 ${clip.frame.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block font-mono">color</Label>
            <input type="color" value={clip.frame.color}
              onChange={(e) => updateClip(clip.id, { frame: { ...clip.frame, color: e.target.value } })}
              className="w-full h-8 rounded-md border border-border cursor-pointer block bg-transparent p-0.5" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block font-mono">
              opacity — {Math.round((clip.frame.opacity ?? 1) * 100)}%
            </Label>
            <Slider min={0} max={1} step={0.05} value={[clip.frame.opacity ?? 1]}
              onValueChange={([v]) => updateClip(clip.id, { frame: { ...clip.frame, opacity: v } })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block font-mono">
              thickness — {clip.frame.width}px
            </Label>
            <Slider min={1} max={24} step={1} value={[clip.frame.width]}
              onValueChange={([v]) => updateClip(clip.id, { frame: { ...clip.frame, width: v } })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block font-mono">
              radius — {clip.frame.radius ?? 0}px
            </Label>
            <Slider min={0} max={80} step={1} value={[clip.frame.radius ?? 0]}
              onValueChange={([v]) => updateClip(clip.id, { frame: { ...clip.frame, radius: v } })} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>speed</SectionLabel>
        <div className="flex gap-1.5 flex-wrap">
          {SPEED_OPTIONS.map((s) => (
            <Button key={s} variant={clip.speed === s ? 'default' : 'outline'} size="sm"
              className="font-mono flex-1"
              onClick={() => updateClip(clip.id, { speed: s })}>
              {s}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root panel router ─────────────────────────────────────────────────────
export default function PropertiesPanel() {
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const sidebarPanel = useEditorStore((s) => s.sidebarPanel);
  const clip = clips.find((c) => c.id === selectedClipId);

  if (!clip) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground font-mono">no clip selected</p>
      </div>
    );
  }

  if (sidebarPanel.type === 'zoom') {
    return <ZoomPanel clipId={clip.id} segId={sidebarPanel.segId} />;
  }

  return (
    <div className="overflow-y-auto h-full">
      <ClipPanel clipId={clip.id} />
    </div>
  );
}
