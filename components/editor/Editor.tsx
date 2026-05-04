'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import Toolbar from './Toolbar';
import UploadZone from './UploadZone';
import PreviewCanvas from './PreviewCanvas';
import Timeline from './Timeline';
import PropertiesPanel from './PropertiesPanel';

export default function Editor() {
  const videoUrl = useEditorStore((s) => s.videoUrl);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { videoDuration, currentTime, isPlaying, setCurrentTime, setPlaying } =
        useEditorStore.getState();
      if (!videoDuration) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!isPlaying);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (isPlaying) setPlaying(false);
        setCurrentTime(Math.max(0, currentTime - 0.1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) setPlaying(false);
        setCurrentTime(Math.min(videoDuration, currentTime + 0.1));
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div id="preview-area" className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
          {videoUrl ? <PreviewCanvas /> : <UploadZone />}
        </div>
        <PropertiesPanel />
      </div>
      <Timeline />
    </div>
  );
}
