'use client';

import { useEditorStore } from '@/store/editorStore';
import Toolbar from './Toolbar';
import UploadZone from './UploadZone';
import PreviewCanvas from './PreviewCanvas';
import Timeline from './Timeline';
import PropertiesPanel from './PropertiesPanel';

export default function Editor() {
  const videoUrl = useEditorStore((s) => s.videoUrl);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
          {videoUrl ? <PreviewCanvas /> : <UploadZone />}
        </div>
        <PropertiesPanel />
      </div>
      <Timeline />
    </div>
  );
}
