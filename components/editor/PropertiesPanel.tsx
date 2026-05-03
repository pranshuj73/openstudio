'use client';

import { useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useEditorStore } from '@/store/editorStore';
import type { Background } from '@/types/editor';

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 4];

const BG_PRESETS: Background[] = [
  { type: 'color', color: '#000000' },
  { type: 'color', color: '#111111' },
  { type: 'color', color: '#1c1c1e' },
  { type: 'color', color: '#ffffff' },
  { type: 'gradient', color: '#0f0c29', gradientTo: '#302b63' },
  { type: 'gradient', color: '#1a1a2e', gradientTo: '#16213e' },
  { type: 'gradient', color: '#0f2027', gradientTo: '#203a43' },
  { type: 'gradient', color: '#200122', gradientTo: '#6f0000' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-2.5">
      {children}
    </p>
  );
}

export default function PropertiesPanel() {
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const updateClip = useEditorStore((s) => s.updateClip);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const clip = clips.find((c) => c.id === selectedClipId);

  if (!clip) {
    return (
      <div className="w-72 border-l border-border bg-background flex items-center justify-center shrink-0">
        <p className="font-mono text-xs text-muted-foreground/40">no clip selected</p>
      </div>
    );
  }

  const handleBgImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateClip(clip.id, {
        background: {
          type: 'image',
          color: '#000000',
          imageUrl: e.target?.result as string,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-72 border-l border-border bg-background overflow-y-auto shrink-0">
      <div className="p-4 space-y-5">

        {/* Background */}
        <div>
          <SectionLabel>background</SectionLabel>

          {/* Color / gradient presets */}
          <div className="flex gap-1.5 flex-wrap mb-2">
            {BG_PRESETS.map((preset, i) => (
              <button
                key={i}
                className="w-6 h-6 border border-border hover:border-foreground/50 transition-colors shrink-0"
                style={
                  preset.type === 'gradient'
                    ? { background: `linear-gradient(135deg, ${preset.color}, ${preset.gradientTo})` }
                    : { background: preset.color }
                }
                onClick={() => updateClip(clip.id, { background: preset })}
              />
            ))}
            {/* Custom solid color */}
            <input
              type="color"
              value={clip.background.color}
              onChange={(e) =>
                updateClip(clip.id, {
                  background: { type: 'color', color: e.target.value },
                })
              }
              className="w-6 h-6 p-0 border border-border cursor-pointer bg-transparent"
              title="custom color"
            />
          </div>

          {/* Image upload */}
          <input
            ref={bgImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBgImageUpload(file);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-1.5 font-mono mb-2"
            onClick={() => bgImageInputRef.current?.click()}
          >
            <ImageIcon className="w-3 h-3" />
            {clip.background.type === 'image' ? 'change image' : 'use image'}
          </Button>

          {/* Image preview */}
          {clip.background.type === 'image' && clip.background.imageUrl && (
            <div className="relative border border-border overflow-hidden" style={{ height: 60 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={clip.background.imageUrl}
                alt="background"
                className="w-full h-full object-cover opacity-80"
              />
              <button
                className="absolute top-1 right-1 bg-black/60 text-white font-mono text-[9px] px-1.5 py-0.5"
                onClick={() =>
                  updateClip(clip.id, {
                    background: { type: 'color', color: '#111111' },
                  })
                }
              >
                remove
              </button>
            </div>
          )}

          {/* Gradient color pickers */}
          {clip.background.type === 'gradient' && (
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <Label className="font-mono text-[10px] text-muted-foreground mb-1 block">from</Label>
                <input
                  type="color"
                  value={clip.background.color}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      background: { ...clip.background, color: e.target.value },
                    })
                  }
                  className="w-full h-7 p-0 border border-border cursor-pointer block"
                />
              </div>
              <div className="flex-1">
                <Label className="font-mono text-[10px] text-muted-foreground mb-1 block">to</Label>
                <input
                  type="color"
                  value={clip.background.gradientTo ?? '#000000'}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      background: { ...clip.background, gradientTo: e.target.value },
                    })
                  }
                  className="w-full h-7 p-0 border border-border cursor-pointer block"
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
            <span className="font-mono text-xs text-muted-foreground w-8 text-right shrink-0">
              {clip.padding}%
            </span>
          </div>
        </div>

        <Separator />

        {/* Frame */}
        <div>
          <SectionLabel>frame</SectionLabel>
          <div className="flex items-center justify-between mb-3">
            <Label className="font-mono text-xs">enabled</Label>
            <Switch
              checked={clip.frame.enabled}
              onCheckedChange={(v) =>
                updateClip(clip.id, { frame: { ...clip.frame, enabled: v } })
              }
            />
          </div>
          {clip.frame.enabled && (
            <div className="space-y-3">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground mb-1.5 block">
                  color
                </Label>
                <input
                  type="color"
                  value={clip.frame.color}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      frame: { ...clip.frame, color: e.target.value },
                    })
                  }
                  className="w-full h-8 p-0 border border-border cursor-pointer block"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground mb-1.5 block">
                  thickness&nbsp;&nbsp;<span className="text-foreground">{clip.frame.width}px</span>
                </Label>
                <Slider
                  min={1}
                  max={24}
                  step={1}
                  value={[clip.frame.width]}
                  onValueChange={([v]) =>
                    updateClip(clip.id, { frame: { ...clip.frame, width: v } })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Speed */}
        <div>
          <SectionLabel>speed</SectionLabel>
          <div className="flex gap-1 flex-wrap">
            {SPEED_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={clip.speed === s ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px] px-2 font-mono"
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
