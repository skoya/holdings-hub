import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { Card } from '@/components/Card';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { assetById } from '@/config/catalog';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: 'bank' | 'entity' | 'persona' | 'holding' | 'network' | 'custodian';
}

type GraphLink = SimulationLinkDatum<GraphNode>;

const KIND_COLOR: Record<GraphNode['kind'], string> = {
  bank: 'var(--accent)',
  entity: 'var(--dark)',
  persona: 'var(--dark-2)',
  holding: 'var(--ink-soft)',
  network: '#7c6f9f',
  custodian: '#4e7d6b',
};

/**
 * Entity relationship graph (PLAN Section 15) rendered with d3-force. M2 uses
 * an SVG-only rendering — the canvas/SVG hybrid is deferred until catalogue
 * expansion makes graphs large enough to need it (logged in DECISIONS.md).
 */
function GraphView() {
  const session = useSessionStore((s) => s.session)!;
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = [{ id: 'meridian', label: 'Meridian Bank (hub)', kind: 'bank' }];
    const links: GraphLink[] = [];
    for (const entity of session.entities) {
      nodes.push({ id: entity.id, label: entity.name, kind: 'entity' });
      links.push({ source: 'meridian', target: entity.id });
    }
    for (const persona of session.personas) {
      nodes.push({ id: persona.id, label: persona.displayName, kind: 'persona' });
      links.push({ source: persona.entityId, target: persona.id });
    }
    const networks = new Set<string>();
    for (const holding of session.holdings) {
      const asset = assetById(holding.assetRef);
      nodes.push({ id: holding.id, label: asset.symbol, kind: 'holding' });
      const owner = session.entities[0]?.id ?? 'meridian';
      links.push({ source: owner, target: holding.id });
      if (holding.network) {
        if (!networks.has(holding.network)) {
          networks.add(holding.network);
          nodes.push({ id: `net-${holding.network}`, label: holding.network, kind: 'network' });
          links.push({ source: 'meridian', target: `net-${holding.network}` });
        }
        links.push({ source: holding.id, target: `net-${holding.network}` });
      }
      if (holding.custodyLocation === 'external-custodian') {
        const custId = 'custodian-external';
        if (!nodes.some((n) => n.id === custId)) {
          nodes.push({ id: custId, label: 'External custodian (fictional)', kind: 'custodian' });
          links.push({ source: 'meridian', target: custId });
        }
        links.push({ source: holding.id, target: custId });
      }
    }
    return { nodes, links };
  }, [session]);

  useEffect(() => {
    const sim = forceSimulation(nodes)
      .force('charge', forceManyBody().strength(-320))
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(90),
      )
      .force('center', forceCenter(380, 240))
      .stop();
    // Deterministic layout: run a fixed number of ticks synchronously.
    for (let i = 0; i < 300; i++) sim.tick();
    setPositions(new Map(nodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])));
  }, [nodes, links]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Entity & network graph</h1>
      <Card>
        <p className="mb-3 text-sm text-ink-soft">
          Meridian as the orchestration hub: client entity, persona, holdings, settlement networks
          and external custodians. Larger multi-entity graphs (with canvas rendering and pinning)
          arrive with the M3 catalogue.
        </p>
        <svg
          ref={svgRef}
          viewBox="0 0 760 480"
          className="w-full rounded border border-line bg-panel"
          role="img"
          aria-label="Force-directed graph of the client entity, personas, holdings and networks"
          data-testid="entity-graph"
        >
          {links.map((l, i) => {
            const s = typeof l.source === 'object' ? (l.source as GraphNode).id : String(l.source);
            const t = typeof l.target === 'object' ? (l.target as GraphNode).id : String(l.target);
            const ps = positions.get(s);
            const pt = positions.get(t);
            if (!ps || !pt) return null;
            return (
              <line
                key={i}
                x1={ps.x}
                y1={ps.y}
                x2={pt.x}
                y2={pt.y}
                stroke="var(--line)"
                strokeWidth={1.2}
              />
            );
          })}
          {nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`}>
                <circle r={n.kind === 'bank' ? 16 : 10} fill={KIND_COLOR[n.kind]} />
                <text
                  y={n.kind === 'bank' ? 30 : 24}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--ink)"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft">
          {Object.entries(KIND_COLOR).map(([kind, color]) => (
            <li key={kind} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
              {kind}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function GraphPage() {
  return (
    <SessionGuard>
      <GraphView />
    </SessionGuard>
  );
}
