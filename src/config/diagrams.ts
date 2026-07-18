import { z } from 'zod';
import type { TransactionType } from '@/schemas';

/**
 * Config-driven process diagram definitions (PLAN Section 14): new flows are
 * JSON entries here, no component changes. Node ids for 'state' nodes match
 * transaction lifecycle states so the renderer can highlight progress.
 */

export const DiagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  kind: z.enum(['state', 'terminal', 'annotation']),
});

export const DiagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  dashed: z.boolean().default(false),
});

export const DiagramDefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  nodes: z.array(DiagramNodeSchema).min(2),
  edges: z.array(DiagramEdgeSchema).min(1),
});

export type DiagramDef = z.infer<typeof DiagramDefSchema>;

const happyRow = (labels: Record<string, string> = {}) =>
  ['draft', 'validated', 'pending-approval', 'approved', 'routing', 'in-flight', 'settled'].map(
    (state, i) => ({
      id: state,
      label: labels[state] ?? state,
      x: i * 150,
      y: 60,
      kind: 'state' as const,
    }),
  );

const happyEdges = () => [
  { from: 'draft', to: 'validated', dashed: false },
  { from: 'validated', to: 'pending-approval', dashed: false },
  { from: 'pending-approval', to: 'approved', dashed: false },
  { from: 'approved', to: 'routing', dashed: false },
  { from: 'routing', to: 'in-flight', dashed: false },
  { from: 'in-flight', to: 'settled', dashed: false },
];

const failureNodes = [
  { id: 'failed', label: 'failed', x: 750, y: 170, kind: 'terminal' as const },
  { id: 'returned', label: 'returned', x: 750, y: 240, kind: 'terminal' as const },
];

const failureEdges = [
  { from: 'in-flight', to: 'failed', dashed: true },
  { from: 'in-flight', to: 'returned', dashed: true },
];

export const DIAGRAM_DEFS: Record<string, DiagramDef> = Object.fromEntries(
  [
    {
      id: 'payment-lifecycle',
      title: 'Payment lifecycle',
      nodes: [...happyRow(), ...failureNodes],
      edges: [...happyEdges(), ...failureEdges],
    },
    {
      id: 'stablecoin-lifecycle',
      title: 'Stablecoin transfer lifecycle',
      nodes: [
        ...happyRow({ routing: 'routing (24/7 rail)' }),
        ...failureNodes,
        {
          id: 'travel-rule',
          label: 'Travel Rule exchange',
          x: 150,
          y: 170,
          kind: 'annotation' as const,
        },
      ],
      edges: [...happyEdges(), ...failureEdges, { from: 'validated', to: 'travel-rule', dashed: true }],
    },
    {
      id: 'dsvp-sequence',
      title: 'Delivery-versus-payment (atomic)',
      nodes: [
        ...happyRow({ 'in-flight': 'atomic DvP legs' }),
        ...failureNodes,
        {
          id: 'delivery-leg',
          label: 'Delivery: tokenised bond',
          x: 600,
          y: 170,
          kind: 'annotation' as const,
        },
        {
          id: 'payment-leg',
          label: 'Payment: tokenised deposit',
          x: 600,
          y: 240,
          kind: 'annotation' as const,
        },
      ],
      edges: [
        ...happyEdges(),
        ...failureEdges,
        { from: 'in-flight', to: 'delivery-leg', dashed: true },
        { from: 'in-flight', to: 'payment-leg', dashed: true },
      ],
    },
  ]
    .map((d) => DiagramDefSchema.parse(d))
    .map((d) => [d.id, d]),
);

export function diagramForTransactionType(type: TransactionType): DiagramDef {
  if (type === 'dsvp-settlement') return DIAGRAM_DEFS['dsvp-sequence']!;
  if (type.startsWith('stablecoin')) return DIAGRAM_DEFS['stablecoin-lifecycle']!;
  return DIAGRAM_DEFS['payment-lifecycle']!;
}
