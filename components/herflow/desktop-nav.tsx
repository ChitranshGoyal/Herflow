'use client'

import { CalendarHeart, HandHeart, House, Info, MapPin, Sparkles, UserRound } from 'lucide-react'
import type { TabId } from '@/lib/herflow-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type DesktopTabId = TabId | 'about'

const items: { id: DesktopTabId; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'cycle', label: 'Cycle', icon: CalendarHeart },
  { id: 'support', label: 'Support', icon: HandHeart },
  { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'about', label: 'About', icon: Info },
]

export function DesktopNav({
  active,
  onChange,
  onOpenSos,
}: {
  active: DesktopTabId
  onChange: (tab: DesktopTabId) => void
  onOpenSos: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 py-3 xl:px-10">
        {/* Brand */}
        <span className="text-sm font-bold tracking-tight shrink-0">
          HERFLOW <span className="text-primary">AI</span>
        </span>

        {/* Nav links */}
        <nav aria-label="Primary" className="flex flex-1 items-center gap-1">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-lavender-soft text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* SOS CTA */}
        <Button
          onClick={onOpenSos}
          size="sm"
          className="shrink-0 rounded-xl bg-rose-strong px-4 text-white hover:bg-rose-strong/90"
        >
          <MapPin className="size-4" aria-hidden="true" />
          Request a pad
        </Button>
      </div>
    </header>
  )
}
