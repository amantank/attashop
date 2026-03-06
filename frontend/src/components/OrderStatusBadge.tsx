import type { OrderStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface Props { status: OrderStatus; size?: 'sm' | 'md'; }

const statusClass: Record<OrderStatus, string> = {
  placed:           'pill-amber',
  confirmed:        'pill-blue',
  out_for_delivery: 'pill-green',
  delivered:        'bg-green-600 text-white pill',
  cancelled:        'pill-red',
};

export default function OrderStatusBadge({ status, size = 'md' }: Props) {
  const { t } = useLanguage();
  const cls = statusClass[status] || 'pill-gray';
  return (
    <span className={`${cls} ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : ''}`}>
      {t(status as Parameters<typeof t>[0])}
    </span>
  );
}
