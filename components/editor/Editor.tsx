'use client';

import { useEffect, useState } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import Toolbar from './Toolbar';
import UploadZone from './UploadZone';
import PreviewCanvas from './PreviewCanvas';
import Timeline from './Timeline';
import PropertiesPanel from './PropertiesPanel';

export default function Editor() {
  const videoUrl = useEditorStore((s) => s.videoUrl);
  const sidebarPanelRef = usePanelRef();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const toggleSidebar = () => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (sidebarCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  };

  return (
    <div className="h-screen bg-background p-2 flex flex-col gap-2 overflow-hidden">
      {/* Toolbar card */}
      <div className="bg-card rounded-xl border border-border shrink-0 overflow-hidden">
        <Toolbar />
      </div>

      {/* Main + Timeline */}
      <Group orientation="vertical" className="flex-1 min-h-0 flex flex-col gap-0">

        {/* Top: canvas + sidebar */}
        <Panel defaultSize={68} minSize={30} className="flex min-h-0">
          <Group orientation="horizontal" className="flex-1 flex">

            {/* Canvas card */}
            <Panel minSize={30} className="min-w-0">
              <div
                id="preview-area"
                className="bg-card rounded-xl border border-border h-full overflow-hidden relative"
              >
                {videoUrl ? <PreviewCanvas /> : <UploadZone />}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 w-7 h-7 opacity-40 hover:opacity-100 transition-opacity"
                  onClick={toggleSidebar}
                >
                  {sidebarCollapsed
                    ? <PanelRightOpen className="w-4 h-4" />
                    : <PanelRightClose className="w-4 h-4" />}
                </Button>
              </div>
            </Panel>

            <Separator
              className="w-2 flex items-center justify-center group cursor-col-resize shrink-0"
            >
              <div className="w-0.5 h-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </Separator>

            {/* Sidebar card */}
            <Panel
              panelRef={sidebarPanelRef}
              defaultSize={22}
              minSize={16}
              collapsible
              onResize={(size) => setSidebarCollapsed(size.asPercentage === 0)}
              className="min-w-0"
            >
              <div className="bg-card rounded-xl border border-border h-full overflow-hidden">
                <PropertiesPanel />
              </div>
            </Panel>

          </Group>
        </Panel>

        <Separator
          className="h-2 flex items-center justify-center group cursor-row-resize shrink-0"
        >
          <div className="h-0.5 w-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
        </Separator>

        {/* Timeline card */}
        <Panel defaultSize={32} minSize={12} collapsible className="min-h-0">
          <div className="bg-card rounded-xl border border-border h-full overflow-hidden">
            <Timeline />
          </div>
        </Panel>

      </Group>
    </div>
  );
}
