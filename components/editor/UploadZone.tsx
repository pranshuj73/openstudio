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
        className="flex flex-col items-center gap-5 border-2 border-dashed border-primary/25 rounded-2xl px-20 py-16 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
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
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-indigo-600/30 transition-all">
          <Upload className="w-5 h-5 text-primary/70 group-hover:text-primary transition-colors" />
        </div>
        <div className="text-center">
          <p className="text-sm text-foreground/80 font-mono">drop video or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-mono">mp4 · mov · webm</p>
        </div>
      </div>
    </div>
  );
}
