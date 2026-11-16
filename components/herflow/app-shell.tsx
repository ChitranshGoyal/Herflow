'use client'

import { Activity, useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from './bottom-nav'
import { DesktopNav } from './desktop-nav'
import { HomeScreen } from './home-screen'
import { CycleScreen } from './cycle-screen'
import { SupportScreen, type SupportView } from './support-screen'
import { AssistantScreen } from './assistant-screen'
import { ProfileScreen } from './profile-screen'
import { EmergencySheet } from './emergency-sheet'
import { Onboarding } from './onboarding'
import { helpers, type TabId } from '@/lib/herflow-data'
import type { PadRequest } from '@/lib/request-types'

export function AppShell() {
  const [tab, setTab] = useState<TabId>('home')
  const [supportView, setSupportView] = useState<SupportView>('periodmate')
  const [sosOpen, setSosOpen] = useState(false)
  const [onboarding, setOnboarding] = useState(false)
  const [request, setRequest] = useState<PadRequest | null>(null)
  const mobileScrollRef = useRef<HTMLElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (request?.status !== 'pending') return
    const timer = setTimeout(() => {
      setRequest((r) => (r && r.status === 'pending' ? { ...r, status: 'accepted', helper: helpers[0] } : r))
    }, 3500)
    return () => clearTimeout(timer)
  }, [request?.status])

  const navigate = (next: TabId, view?: SupportView) => {
    if (view) setSupportView(view)
    setTab(next)
    mobileScrollRef.current?.scrollTo({ top: 0 })
    desktopScrollRef.current?.scrollTo({ top: 0 })
  }

  const closeSos = useCallback(() => setSosOpen(false), [])

  const requestHandlers = {
    request,
    onOpenSos: () => setSosOpen(true),
    onCompleteRequest: () => setRequest((r) => (r ? { ...r, status: 'completed' } : r)),
    onCancelRequest: () => setRequest(null),
    onDismissRequest: () => setRequest(null),
  }

  const screenContent = (
    <>
      <Activity mode={tab === 'home' ? 'visible' : 'hidden'}>
        <HomeScreen onNavigate={navigate} {...requestHandlers} />
      </Activity>
      <Activity mode={tab === 'cycle' ? 'visible' : 'hidden'}>
        <CycleScreen />
      </Activity>
      <Activity mode={tab === 'support' ? 'visible' : 'hidden'}>
        <SupportScreen view={supportView} onViewChange={setSupportView} {...requestHandlers} />
      </Activity>
      <Activity mode={tab === 'assistant' ? 'visible' : 'hidden'}>
        <AssistantScreen />
      </Activity>
      <Activity mode={tab === 'profile' ? 'visible' : 'hidden'}>
        <ProfileScreen onReplayOnboarding={() => setOnboarding(true)} />
      </Activity>
    </>
  )

  return (
    <>
      {/* ── MOBILE LAYOUT (< lg) ─────────────────────────────────────────── */}
      <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#efedf6,transparent_60%),radial-gradient(ellipse_at_bottom_right,#f7e9eb,transparent_55%)] lg:hidden">
        <main ref={mobileScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {screenContent}
        </main>
        <BottomNav active={tab} onChange={(t) => navigate(t)} />
        <EmergencySheet
          open={sosOpen}
          onClose={closeSos}
          onSubmit={(data) => {
            setRequest({ ...data, id: crypto.randomUUID(), status: 'pending', helper: null })
            setSosOpen(false)
          }}
        />
        {onboarding ? <Onboarding onFinish={() => setOnboarding(false)} /> : null}
      </div>

      {/* ── DESKTOP LAYOUT (≥ lg) ────────────────────────────────────────── */}
      <div className="hidden min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#efedf6,transparent_60%),radial-gradient(ellipse_at_bottom_right,#f7e9eb,transparent_55%)] lg:flex">
        {/* Top navbar */}
        <DesktopNav active={tab} onChange={(t) => navigate(t)} onOpenSos={() => setSosOpen(true)} />

        {/* Body: sidebar + main content */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-8 xl:px-10">
          {/* Left sidebar – marketing / info panel */}
          <aside className="hidden w-64 shrink-0 xl:block">
            <div className="sticky top-24 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">About</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Private cycle tracking, one-tap emergency pad support, live dispenser availability and an AI
                  assistant in English and Hindi — built for campus life.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Features</p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    { label: 'CycleGuard', desc: 'Tracking & insights' },
                    { label: 'PeriodMate', desc: 'Emergency support' },
                    { label: 'PadWatch', desc: 'Live availability' },
                    { label: 'PeriodLens', desc: 'AI assistant' },
                    { label: 'Pad-to-Pad', desc: 'Community' },
                  ].map((f) => (
                    <li key={f.label} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span>
                        <span className="font-semibold">{f.label}</span>
                        <span className="text-muted-foreground"> · {f.desc}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-sage-soft p-4 text-sm leading-relaxed text-sage-strong">
                🔒 Private by design. Your data is encrypted and never sold.
              </div>
            </div>
          </aside>

          {/* Main scrollable content area */}
          <div
            ref={desktopScrollRef}
            className="min-w-0 flex-1 overflow-y-auto rounded-3xl border border-border/60 bg-background shadow-[0_4px_32px_-8px_rgba(41,40,50,0.1)]"
            style={{ maxHeight: 'calc(100dvh - 7rem)' }}
          >
            {screenContent}
          </div>
        </div>

        {/* Desktop emergency sheet (portal-style, fixed) */}
        {sosOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm">
            <div className="relative w-full max-w-lg overflow-y-auto max-h-[90vh]">
              <EmergencySheet
                open={sosOpen}
                onClose={closeSos}
                bare
                onSubmit={(data) => {
                  setRequest({ ...data, id: crypto.randomUUID(), status: 'pending', helper: null })
                  setSosOpen(false)
                }}
              />
            </div>
          </div>
        )}

        {onboarding ? (
          <div className="fixed inset-0 z-50 bg-background">
            <Onboarding onFinish={() => setOnboarding(false)} />
          </div>
        ) : null}
      </div>
    </>
  )
}
