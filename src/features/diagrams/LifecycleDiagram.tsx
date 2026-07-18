import { ReactFlow, Background, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { diagramForTransactionType, type DiagramDef } from '@/config/diagrams';
import type { LifecycleEvent, TransactionState, TransactionType } from '@/schemas';

/**
 * Generic process diagram renderer (PLAN Section 14): definitions are JSON in
 * src/config/diagrams.ts; state nodes highlight from the transaction's event
 * history. New flows require a config entry only.
 */
export function LifecycleDiagram({
  type,
  currentState,
  events,
}: {
  type: TransactionType;
  currentState: TransactionState;
  events: LifecycleEvent[];
}) {
  const def: DiagramDef = diagramForTransactionType(type);
  const visited = new Set<string>(events.map((e) => e.state));
  visited.add('draft');

  const nodes: Node[] = def.nodes.map((n) => ({
    id: n.id,
    position: { x: n.x, y: n.y },
    data: { label: n.label },
    style: {
      border:
        n.id === currentState
          ? '2px solid var(--accent)'
          : visited.has(n.id)
            ? '1.5px solid var(--dark)'
            : n.kind === 'annotation'
              ? '1px dashed var(--ink-soft)'
              : n.kind === 'terminal'
                ? '1px dashed var(--line)'
                : '1px solid var(--line)',
      background: visited.has(n.id) ? 'var(--panel)' : 'var(--bg)',
      color: n.kind === 'annotation' ? 'var(--ink-soft)' : 'var(--ink)',
      borderRadius: 8,
      fontSize: 12,
      padding: 6,
      width: 130,
    },
  }));

  const edges: Edge[] = def.edges.map((e) => ({
    id: `${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    animated: e.from === currentState,
    style: e.dashed
      ? { strokeDasharray: '4 3', stroke: 'var(--ink-soft)' }
      : visited.has(e.to)
        ? { stroke: 'var(--dark)' }
        : undefined,
  }));

  return (
    <div style={{ height: 340 }} aria-label={`${def.title} diagram`} role="img">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
