import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export interface DialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Radix-based modal dialog: focus trap, ESC close, ARIA wiring built in. */
export function Dialog({ trigger, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root>
      <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-dark/50" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-panel p-6 shadow-lg">
          <RadixDialog.Title className="text-lg font-semibold">{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-ink-soft">
              {description}
            </RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
          <div className="mt-6 flex justify-end">
            <RadixDialog.Close asChild>
              <button
                type="button"
                className="rounded border border-line bg-panel px-4 py-2 text-sm font-medium hover:bg-bg"
              >
                Close
              </button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
