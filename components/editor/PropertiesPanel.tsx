'use client';

import { useRef } from 'react';
import { ImageIcon, Plus, X, ChevronLeft, PanelRightClose } from 'lucide-react';
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
    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2.5 font-mono">
      {children}
    </p>
  );
}

// ─── Panel header ──────────────────────────────────────────────────────────
function PanelHeader({ children, onCollapse }: { children: React.ReactNode; onCollapse?: () => void }) {
  return (
    <div className="h-10 border-b border-border flex items-center px-3 gap-2 shrink-0">
      <span className="flex-1 text-xs font-mono font-medium text-muted-foreground">{children}</span>
      {onCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 -mr-0.5 opacity-50 hover:opacity-100"
          onClick={onCollapse}
        >
          <PanelRightClose className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// ─── Zoom panel ────────────────────────────────────────────────────────────
function ZoomPanel({
  clipId,
  segId,
  onCollapse,
}: {
  clipId: string;
  segId: string;
  onCollapse?: () => void;
}) {
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
      <div className="h-10 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => setSidebarPanel({ type: 'clip' })}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          clip
        </button>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs font-medium font-mono">zoom</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums">
          {formatTime(seg.startTime)}–{formatTime(seg.endTime)}
        </span>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 -mr-0.5 opacity-50 hover:opacity-100 shrink-0"
            onClick={onCollapse}
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">

          <div>
            <SectionLabel>scale</SectionLabel>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {SCALE_PRESETS.map((s) => (
                <Button
                  key={s}
                  variant={seg.scale === s ? 'default' : 'outline'}
                  size="sm"
                  className="font-mono text-xs"
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
              <span className="text-xs text-muted-foreground w-9 text-right shrink-0 font-mono tabular-nums">
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
              className="w-full font-mono text-xs"
              onClick={() =>
                updateZoomSegment(clipId, segId, {
                  startTime: clip.sourceStart,
                  endTime: clip.sourceEnd,
                })
              }
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
              className="w-full gap-1.5 mb-3 font-mono text-xs"
              disabled={!inSeg}
              onClick={() => addPanKeyframe(clipId, segId, { time: currentTime })}
            >
              <Plus className="w-3.5 h-3.5" />
              add keyframe at playhead
            </Button>

            {seg.panKeyframes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 font-mono">
                add keyframes to pan while zoomed
              </p>
            ) : (
              <div className="space-y-2">
                {seg.panKeyframes.map((kf) => (
                  <div key={kf.id} className="bg-muted/60 rounded-lg px-3 py-2.5 space-y-2.5 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {formatTime(kf.time)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5"
                        onClick={() => removePanKeyframe(clipId, segId, kf.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1.5 block font-mono">
                        x — {kf.x.toFixed(2)}
                      </Label>
                      <Slider
                        min={0} max={1} step={0.01} value={[kf.x]}
                        onValueChange={([v]) => updatePanKeyframe(clipId, segId, kf.id, { x: v })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1.5 block font-mono">
                        y — {kf.y.toFixed(2)}
                      </Label>
                      <Slider
                        min={0} max={1} step={0.01} value={[kf.y]}
                        onValueChange={([v]) => updatePanKeyframe(clipId, segId, kf.id, { y: v })}
                      />
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
            className="w-full font-mono text-xs"
            onClick={() => {
              removeZoomSegment(clipId, segId);
              setSidebarPanel({ type: 'clip' });
            }}
          >
            delete zoom region
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Clip panel ────────────────────────────────────────────────────────────
function ClipPanel({ clipId, onCollapse }: { clipId: string; onCollapse?: () => void }) {
  const clips = useEditorStore((s) => s.clips);
  const updateClip = useEditorStore((s) => s.updateClip);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return null;

  const handleBgImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateClip(clip.id, {
        background: { type: 'image', color: '#000000', imageUrl: e.target?.result as string },
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader onCollapse={onCollapse}>clip</PanelHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Background */}
        <div>
          <SectionLabel>background</SectionLabel>
          <div className="grid grid-cols-5 gap-1.5 mb-2.5">
            {BG_PRESETS.map((preset, i) => {
              const active = bgMatch(clip.background, preset);
              return (
                <button
                  key={i}
                  className={`h-8 rounded-md shrink-0 transition-all border-2 ${
                    active
                      ? 'border-primary ring-2 ring-primary/25'
                      : 'border-transparent hover:border-foreground/20'
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
              onChange={(e) =>
                updateClip(clip.id, { background: { type: 'color', color: e.target.value } })
              }
              className="h-8 rounded-md border-2 border-transparent cursor-pointer bg-transparent p-0.5 hover:border-foreground/20"
              title="custom color"
            />
          </div>

          <input
            ref={bgImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleBgImageUpload(f);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 font-mono text-xs mb-2"
            onClick={() => bgImageInputRef.current?.click()}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {clip.background.type === 'image' ? 'change image' : 'use image'}
          </Button>

          {clip.background.type === 'image' && clip.background.imageUrl && (
            <div className="relative rounded-md overflow-hidden border border-border" style={{ height: 56 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={clip.background.imageUrl}
                alt="background"
                className="w-full h-full object-cover"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-1.5 right-1.5 h-5 text-[10px] font-mono px-2"
                onClick={() =>
                  updateClip(clip.id, { background: { type: 'color', color: '#111111' } })
                }
              >
                remove
              </Button>
            </div>
          )}

          {clip.background.type === 'gradient' && (
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground mb-1 block font-mono">from</Label>
                <input
                  type="color"
                  value={clip.background.color}
                  onChange={(e) =>
                    updateClip(clip.id, { background: { ...clip.background, color: e.target.value } })
                  }
                  className="w-full h-8 rounded-md border border-border cursor-pointer block bg-transparent p-0.5"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground mb-1 block font-mono">to</Label>
                <input
                  type="color"
                  value={clip.background.gradientTo ?? '#000000'}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      background: { ...clip.background, gradientTo: e.target.value },
                    })
                  }
                  className="w-full h-8 rounded-md border border-border cursor-pointer block bg-transparent p-0.5"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Padding */}
        <div>
          <SectionLabel>padding</SectionLabel>
          <div className="flex items-center gap-3">
            <Slider
              min={0}
              max={20}
              step={0.5}
              value={[clip.padding]}
              onValueChange={([v]) => updateClip(clip.id, { padding: v })}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-9 text-right shrink-0 font-mono tabular-nums">
              {clip.padding}%
            </span>
          </div>
        </div>

        <Separator />

        {/* Frame */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>frame</SectionLabel>
            <Switch
              checked={clip.frame.enabled}
              onCheckedChange={(v) => updateClip(clip.id, { frame: { ...clip.frame, enabled: v } })}
            />
          </div>
          <div className={`space-y-3.5 ${clip.frame.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1.5 block font-mono">color</Label>
              <input
                type="color"
                value={clip.frame.color}
                onChange={(e) =>
                  updateClip(clip.id, { frame: { ...clip.frame, color: e.target.value } })
                }
                className="w-full h-8 rounded-md border border-border cursor-pointer block bg-transparent p-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1.5 block font-mono">
                opacity — {Math.round((clip.frame.opacity ?? 1) * 100)}%
              </Label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[clip.frame.opacity ?? 1]}
                onValueChange={([v]) => updateClip(clip.id, { frame: { ...clip.frame, opacity: v } })}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1.5 block font-mono">
                thickness — {clip.frame.width}px
              </Label>
              <Slider
                min={1}
                max={24}
                step={1}
                value={[clip.frame.width]}
                onValueChange={([v]) => updateClip(clip.id, { frame: { ...clip.frame, width: v } })}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1.5 block font-mono">
                radius — {clip.frame.radius ?? 0}px
              </Label>
              <Slider
                min={0}
                max={80}
                step={1}
                value={[clip.frame.radius ?? 0]}
                onValueChange={([v]) => updateClip(clip.id, { frame: { ...clip.frame, radius: v } })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Speed */}
        <div>
          <SectionLabel>speed</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {SPEED_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={clip.speed === s ? 'default' : 'outline'}
                size="sm"
                className="font-mono text-xs"
                onClick={() => updateClip(clip.id, { speed: s })}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Root panel router ─────────────────────────────────────────────────────
export default function PropertiesPanel({ onCollapse }: { onCollapse?: () => void }) {
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const sidebarPanel = useEditorStore((s) => s.sidebarPanel);
  const clip = clips.find((c) => c.id === selectedClipId);

  if (!clip) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PanelHeader>properties</PanelHeader>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-mono">no clip selected</p>
        </div>
      </div>
    );
  }

  if (sidebarPanel.type === 'zoom') {
    return <ZoomPanel clipId={clip.id} segId={sidebarPanel.segId} onCollapse={onCollapse} />;
  }

  return <ClipPanel clipId={clip.id} onCollapse={onCollapse} />;
}
