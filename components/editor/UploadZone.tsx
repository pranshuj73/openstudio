'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';

export default function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadVideo = useEditorStore((s) => s.loadVideo);

  const handleFile = (file: File) => {
    const tempUrl = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.src = tempUrl;
    vid.onloadedmetadata = () => {
      loadVideo(file, vid.duration, vid.videoWidth, vid.videoHeight);
      URL.revokeObjectURL(tempUrl);
    };
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-3 border border-dashed border-border px-20 py-14 cursor-pointer hover:border-foreground/30 transition-colors"
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
        <Upload className="w-6 h-6 text-muted-foreground" />
        <div className="text-center">
          <p className="font-mono text-sm text-muted-foreground">
            drop video or click to upload
          </p>
          <p className="font-mono text-xs text-muted-foreground/50 mt-0.5">
            mp4 · mov · webm
          </p>
        </div>
      </div>
    </div>
  );
}
