'use client';

import { useEffect, useState } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { PanelRightOpen } from 'lucide-react';
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
    <div className="h-screen bg-background p-2 flex flex-col gap-1.5 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-card rounded-lg border border-border shrink-0 overflow-hidden">
        <Toolbar />
      </div>

      {/* Main + Timeline */}
      {/* NOTE: string values = percentages, numeric values = pixels (react-resizable-panels v4) */}
      <Group orientation="vertical" className="flex-1 min-h-0 flex flex-col gap-0">

        {/* Canvas + Sidebar */}
        <Panel defaultSize="66" minSize="30" className="flex min-h-0">
          <Group orientation="horizontal" className="flex-1 flex">

            {/* Canvas */}
            <Panel minSize="30" className="min-w-0">
              <div
                id="preview-area"
                className="bg-card rounded-lg border border-border h-full overflow-hidden relative"
              >
                {videoUrl ? <PreviewCanvas /> : <UploadZone />}
                {sidebarCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 w-7 h-7 opacity-50 hover:opacity-100 transition-opacity"
                    onClick={toggleSidebar}
                  >
                    <PanelRightOpen className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Panel>

            <Separator className="w-2 flex items-center justify-center group cursor-col-resize shrink-0">
              <div className="w-px h-6 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </Separator>

            {/* Sidebar — 30% default, 22% min */}
            <Panel
              panelRef={sidebarPanelRef}
              defaultSize="30"
              minSize="22"
              collapsible
              onResize={(size) => setSidebarCollapsed(size.asPercentage === 0)}
              className="min-w-0"
            >
              <div className="bg-card rounded-lg border border-border h-full overflow-hidden">
                <PropertiesPanel onCollapse={toggleSidebar} />
              </div>
            </Panel>

          </Group>
        </Panel>

        <Separator className="h-2 flex items-center justify-center group cursor-row-resize shrink-0">
          <div className="h-px w-6 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
        </Separator>

        {/* Timeline */}
        <Panel defaultSize="34" minSize="12" collapsible className="min-h-0">
          <div className="bg-card rounded-lg border border-border h-full overflow-hidden">
            <Timeline />
          </div>
        </Panel>

      </Group>
    </div>
  );
}
