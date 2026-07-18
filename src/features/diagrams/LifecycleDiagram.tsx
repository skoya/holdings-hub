import { ReactFlow, Background, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { HAPPY_PATH } from '@/engine/lifecycle';
import type { LifecycleEvent, TransactionState } from '@/schemas';

/**
 * First xyflow process diagram (PLAN Section 14): the payment lifecycle state
 * machine. Node definitions are data-driven; the current state and traversed
 * path are highlighted from the transaction's event history.
 */
export function LifecycleDiagram({
  currentState,
  events,
}: {
  currentState: TransactionState;
  events: LifecycleEvent[];
}) {
  const visited = new Set(events.map((e) => e.state));
  visited.add('draft');

  const terminalExtras: TransactionState[] = ['failed', 'returned'];
  const nodes: Node[] = [
    ...HAPPY_PATH.map((state, i) => ({
      id: state,
      position: { x: i * 150, y: 60 },
      data: { label: state },
      style: {
        border:
          state === currentState
            ? '2px solid var(--accent)'
            : visited.has(state)
              ? '1.5px solid var(--dark)'
              : '1px solid var(--line)',
        background: visited.has(state) ? 'var(--panel)' : 'var(--bg)',
        color: 'var(--ink)',
        borderRadius: 8,
        fontSize: 12,
        padding: 6,
        width: 120,
      },
    })),
    ...terminalExtras.map((state, i) => ({
      id: state,
      position: { x: 5 * 150, y: 160 + i * 70 },
      data: { label: state },
      style: {
        border: state === currentState ? '2px solid var(--accent)' : '1px dashed var(--line)',
        background: visited.has(state) ? 'var(--panel)' : 'var(--bg)',
        color: 'var(--ink)',
        borderRadius: 8,
        fontSize: 12,
        padding: 6,
        width: 120,
      },
    })),
  ];

  const edges: Edge[] = [
    ...HAPPY_PATH.slice(0, -1).map((state, i) => {
      const next = HAPPY_PATH[i + 1]!;
      return {
        id: `${state}-${next}`,
        source: state,
        target: next,
        animated: state === currentState,
        style: visited.has(next) ? { stroke: 'var(--dark)' } : undefined,
      };
    }),
    { id: 'in-flight-failed', source: 'in-flight', target: 'failed', style: undefined },
    { id: 'in-flight-returned', source: 'in-flight', target: 'returned', style: undefined },
  ];

  return (
    <div style={{ height: 320 }} aria-label="Transaction lifecycle diagram" role="img">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
