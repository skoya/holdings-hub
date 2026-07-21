import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { SessionGuard } from '@/features/common/SessionGuard';
import { TimelineView } from '@/features/timeline/TimelinePage';
import { GraphView } from '@/features/graph/GraphPage';

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'graph', label: 'Graph' },
] as const;

/**
 * Collapsible right-side panel showing Timeline or Graph on any page.
 * Opened / closed via uiStore.openPanel / closePanel; tab selection
 * persists as long as the panel stays open.
 */
export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, openPanel, closePanel } = useUiStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC closes the panel.
  useEffect(() => {
    if (!rightPanelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rightPanelOpen, closePanel]);

  // Trap focus on open so assistive tech stays inside.
  useEffect(() => {
    if (rightPanelOpen) panelRef.current?.focus();
  }, [rightPanelOpen]);

  return (
    <>
      {/* Scrim — clicking outside closes the panel */}
      {rightPanelOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
          aria-hidden
          onClick={closePanel}
        />
      )}

      {/* Drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${rightPanelTab === 'timeline' ? 'Timeline' : 'Graph'} panel`}
        tabIndex={-1}
        className={`fixed right-0 top-0 z-40 flex h-full w-[min(520px,92vw)] flex-col bg-panel shadow-2xl outline-none transition-transform duration-200 ${
          rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-line bg-dark px-4 py-2">
          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => openPanel(tab.id)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  rightPanelTab === tab.id
                    ? 'bg-dark-2 text-white'
                    : 'text-white/60 hover:bg-dark-2 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={closePanel}
            aria-label="Close panel"
            className="rounded p-1.5 text-white/60 hover:bg-dark-2 hover:text-white"
          >
            {/* ✕ */}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <SessionGuard>
            {rightPanelTab === 'timeline' ? <TimelineView /> : <GraphView />}
          </SessionGuard>
        </div>
      </div>
    </>
  );
}

/** Floating toggle buttons shown in the bottom-right corner of every page. */
export function PanelToggles() {
  const { rightPanelOpen, rightPanelTab, openPanel, closePanel } = useUiStore();

  function toggle(tab: 'timeline' | 'graph') {
    if (rightPanelOpen && rightPanelTab === tab) {
      closePanel();
    } else {
      openPanel(tab);
    }
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2">
      {(['timeline', 'graph'] as const).map((tab) => {
        const active = rightPanelOpen && rightPanelTab === tab;
        return (
          <button
            key={tab}
            onClick={() => toggle(tab)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-md transition-colors ${
              active
                ? 'bg-dark text-white'
                : 'bg-panel text-ink hover:bg-dark hover:text-white border border-line'
            }`}
          >
            {tab === 'timeline' ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
                <path d="M2 8h12M8 2v12" strokeLinecap="round" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
                <circle cx="4" cy="4" r="2" />
                <circle cx="12" cy="4" r="2" />
                <circle cx="8" cy="12" r="2" />
                <path d="M4 6v2a4 4 0 008 0V6" strokeLinecap="round" />
              </svg>
            )}
            {tab === 'timeline' ? 'Timeline' : 'Graph'}
          </button>
        );
      })}
    </div>
  );
}
