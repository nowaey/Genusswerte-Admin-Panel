import { cn } from '@/lib/utils'
import type { OrderStatus, PaymentStatus, VoucherStatus, RedemptionStatus, BookingStatus, GroupRequestStatus } from '@/types/database'

type AnyStatus = OrderStatus | PaymentStatus | VoucherStatus | RedemptionStatus | BookingStatus | GroupRequestStatus

const labels: Record<string, string> = {
  // order status
  inquiry:              'Anfrage',
  payment_open:         'Zahlung offen',
  paid:                 'Bezahlt',
  in_preparation:       'In Vorbereitung',
  ready:                'Bereit',
  completed:            'Abgeschlossen',
  cancelled:            'Storniert',
  refunded:             'Erstattet',
  // payment status
  open:                 'Offen',
  // voucher status
  pending:              'Ausstehend',
  active:               'Aktiv',
  redemption_requested: 'Einlösung angefragt',
  date_confirmed:       'Termin bestätigt',
  redeemed:             'Eingelöst',
  expired:              'Abgelaufen',
  // redemption status
  under_review:         'In Prüfung',
  alternative_proposed: 'Alternative vorgeschlagen',
  rejected:             'Abgelehnt',
  // group request status
  new:                  'Neu',
  reviewing:            'In Prüfung',
  offer_sent:           'Angebot gesendet',
  confirmed:            'Bestätigt',
}

const colors: Record<string, string> = {
  inquiry:              'bg-blue-50 text-blue-700 border-blue-200',
  payment_open:         'bg-amber-50 text-amber-700 border-amber-200',
  open:                 'bg-amber-50 text-amber-700 border-amber-200',
  pending:              'bg-amber-50 text-amber-700 border-amber-200',
  under_review:         'bg-amber-50 text-amber-700 border-amber-200',
  paid:                 'bg-green-50 text-green-700 border-green-200',
  active:               'bg-green-50 text-green-700 border-green-200',
  in_preparation:       'bg-violet-50 text-violet-700 border-violet-200',
  ready:                'bg-cyan-50 text-cyan-700 border-cyan-200',
  date_confirmed:       'bg-green-50 text-green-700 border-green-200',
  redemption_requested: 'bg-blue-50 text-blue-700 border-blue-200',
  alternative_proposed: 'bg-orange-50 text-orange-700 border-orange-200',
  completed:            'bg-slate-100 text-slate-600 border-slate-200',
  redeemed:             'bg-slate-100 text-slate-600 border-slate-200',
  cancelled:            'bg-red-50 text-red-600 border-red-200',
  refunded:             'bg-red-50 text-red-600 border-red-200',
  expired:              'bg-red-50 text-red-600 border-red-200',
  rejected:             'bg-red-50 text-red-600 border-red-200',
  // group request / booking
  new:                  'bg-blue-50 text-blue-700 border-blue-200',
  reviewing:            'bg-amber-50 text-amber-700 border-amber-200',
  offer_sent:           'bg-violet-50 text-violet-700 border-violet-200',
  confirmed:            'bg-green-50 text-green-700 border-green-200',
}

export default function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium',
      colors[status] ?? 'bg-muted text-muted-foreground border-border',
      className,
    )}>
      {labels[status] ?? status}
    </span>
  )
}
