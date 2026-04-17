/**
 * Barrel export for v2 UI primitives.
 * Import from '@/components/ui' (the Button lives in ./button).
 *
 * Usage:
 *   import { StatusPill, KpiCard, Toggle, ClientAvatar } from '@/components/ui'
 */

export { StatusPill } from './StatusPill'
export type { StatusPillProps, StatusTone } from './StatusPill'

export { KpiCard } from './KpiCard'
export type { KpiCardProps, KpiTone } from './KpiCard'

export { Toggle } from './Toggle'
export type { ToggleProps } from './Toggle'

export { ClientAvatar, initialsFromName } from './ClientAvatar'
export type { ClientAvatarProps, AvatarSize } from './ClientAvatar'

export { Segmented } from './Segmented'
export type { SegmentedProps, SegmentedOption } from './Segmented'

export { DocHero, DocMeta } from './DocHero'
export type { DocHeroProps, DocMetaProps } from './DocHero'

export { DetailSidebar, SideCard } from './DetailSidebar'
export type { DetailSidebarProps, SideCardProps } from './DetailSidebar'

export { TimelineList } from './TimelineList'
export type { TimelineListProps, TimelineItem, TimelineTone } from './TimelineList'

export { TotalsCard } from './TotalsCard'
export type { TotalsCardProps, TotalsRow } from './TotalsCard'

export { Toolbar } from './Toolbar'
export type { ToolbarProps } from './Toolbar'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'
