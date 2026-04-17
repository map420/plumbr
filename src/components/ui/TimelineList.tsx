/**
 * TimelineList — v2 list of timestamped events with colored dots.
 * Used in the activity sidebar of estimate/invoice/job detail views.
 *
 * <TimelineList
 *   items={[
 *     { tone: 'success', event: 'Client viewed', time: '3× · last 2h ago' },
 *     { tone: 'info', event: 'Email sent', time: 'Apr 14, 9:03am' },
 *     { event: 'Created', time: 'Apr 14, 8:45am' },
 *   ]}
 * />
 */
import { cn } from '@/lib/utils'

export type TimelineTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export interface TimelineItem {
  event: React.ReactNode
  time?: React.ReactNode
  tone?: TimelineTone
}

export interface TimelineListProps {
  items: TimelineItem[]
  className?: string
}

const DOT_CLASS: Record<TimelineTone, string> = {
  info: 'wp-timeline-dot--info',
  success: 'wp-timeline-dot--success',
  warning: 'wp-timeline-dot--warning',
  danger: 'wp-timeline-dot--danger',
  neutral: '',
}

export function TimelineList({ items, className }: TimelineListProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((it, i) => (
        <div key={i} className="wp-timeline-item">
          <span className={cn('wp-timeline-dot', it.tone && DOT_CLASS[it.tone])} aria-hidden="true" />
          <div>
            <div className="wp-timeline-event">{it.event}</div>
            {it.time && <div className="wp-timeline-time">{it.time}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
