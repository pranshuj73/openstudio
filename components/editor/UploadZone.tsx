'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';

async function generateThumbnails(url: string, duration: number, count = 20): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.preload = 'auto';

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d')!;
    const thumbs: string[] = [];
    let i = 0;

    const seekNext = () => {
      if (i >= count) { resolve(thumbs); return; }
      video.currentTime = (i / (count - 1)) * duration;
      i++;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, 160, 90);
      thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
      seekNext();
    };

    video.onloadeddata = () => seekNext();
    video.load();
  });
}

export default function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadVideo = useEditorStore((s) => s.loadVideo);
  const setThumbnails = useEditorStore((s) => s.setThumbnails);

  const handleFile = (file: File) => {
    const tempUrl = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.src = tempUrl;
    vid.onloadedmetadata = async () => {
      loadVideo(file, vid.duration, vid.videoWidth, vid.videoHeight);
      const storeUrl = useEditorStore.getState().videoUrl!;
      URL.revokeObjectURL(tempUrl);
      const thumbs = await generateThumbnails(storeUrl, vid.duration);
      setThumbnails(thumbs);
    };
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-4 border-2 border-dashed border-border/40 rounded-2xl px-20 py-16 cursor-pointer hover:border-border/70 hover:bg-white/[0.02] transition-all group"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith('video/')) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-muted transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-mono text-sm text-foreground/70">
            drop video or click to upload
          </p>
          <p className="font-mono text-xs text-muted-foreground/50 mt-1">
            mp4 · mov · webm
          </p>
        </div>
      </div>
    </div>
  );
}
