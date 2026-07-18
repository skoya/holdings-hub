import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { Dialog } from '@/components/Dialog';

const tokens = [
  ['--dark', '#171a21'],
  ['--dark-2', '#20242e'],
  ['--accent', '#d81f2a'],
  ['--bg', '#f4f5f7'],
  ['--panel', '#ffffff'],
  ['--ink', '#16181d'],
  ['--ink-soft', '#5a6270'],
  ['--line', '#e3e6eb'],
  ['--banner', '#f0b429'],
] as const;

export function StyleguidePage() {
  const [selectedChip, setSelectedChip] = useState('All assets');
  const chips = ['All assets', 'Traditional', 'Tokenised', 'Digital'];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Meridian design system</h1>

      <Card title="Colour tokens">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {tokens.map(([name, hex]) => (
            <div key={name} className="text-center">
              <div
                className="mx-auto h-12 w-12 rounded border border-line"
                style={{ backgroundColor: `var(${name})` }}
              />
              <div className="mt-1 font-mono text-xs">{name}</div>
              <div className="font-mono text-xs text-ink-soft">{hex}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Typography scale">
        <div className="space-y-2">
          <p className="text-xs">12px — captions, diagnostics</p>
          <p className="text-sm">14px — secondary text, tables</p>
          <p className="text-base">16px — body</p>
          <p className="text-lg">20px — section headings</p>
          <p className="text-xl">24px — page headings</p>
          <p className="text-2xl">32px — display</p>
        </div>
      </Card>

      <Card title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Settled</Badge>
          <Badge tone="warning">Pending approval</Badge>
        </div>
      </Card>

      <Card title="Chips">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Chip key={chip} selected={selectedChip === chip} onClick={() => setSelectedChip(chip)}>
              {chip}
            </Chip>
          ))}
        </div>
      </Card>

      <Card title="Dialog (Radix)">
        <Dialog
          trigger={<Button variant="secondary">Open example dialog</Button>}
          title="Example dialog"
          description="Focus is trapped, ESC closes, and ARIA attributes are handled by Radix."
        >
          <p className="text-sm">
            Modal content goes here. This primitive will host transaction confirmations and approval
            flows from Milestone 2.
          </p>
        </Dialog>
      </Card>
    </div>
  );
}
