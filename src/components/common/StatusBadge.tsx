import { cn } from '@/lib/utils';
import { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning' },
  accepted: { label: 'Accepted', className: 'bg-accent/10 text-accent' },
  preparing: { label: 'Preparing', className: 'bg-primary/10 text-primary' },
  ready: { label: 'Ready', className: 'bg-success/10 text-success' },
  picked: { label: 'Picked Up', className: 'bg-accent/10 text-accent' },
  on_the_way: { label: 'On the Way', className: 'bg-primary/10 text-primary' },
  delivered: { label: 'Delivered', className: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
