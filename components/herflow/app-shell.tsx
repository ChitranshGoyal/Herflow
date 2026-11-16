'use client'

import { Activity, useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from './bottom-nav'
import { DesktopNav, type DesktopTabId } from './desktop-nav'
import { HomeScreen } from './home-screen'
import { CycleScreen } from './cycle-screen'
import { SupportScreen, type SupportView } from './support-screen'
import { AssistantScreen } from './assistant-screen'
import { ProfileScreen } from './profile-screen'
import { AboutScreen } from './about-screen'
import { EmergencySheet } from './emergency-sheet'
import { Onboarding } from './onboarding'
import { helpers, type TabId } from '@/lib/herflow-data'
import type { PadRequest } from '@/lib/request-types'

export function AppShell() {
  // Mobile uses TabId only; desktop has an extra 'about' tab
  const [tab, setTab] = useState<TabId>('home')
  const [desktopTab, setDesktopTab] = useState<DesktopTabId>('home')
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

  /** Navigate mobile tabs */
  const navigate = (next: TabId, view?: SupportView) => {
    if (view) setSupportView(view)
    setTab(next)
    setDesktopTab(next)
    mobileScrollRef.current?.scrollTo({ top: 0 })
    desktopScrollRef.current?.scrollTo({ top: 0 })
  }

  /** Navigate desktop tabs (includes 'about') */
  const navigateDesktop = (next: DesktopTabId, view?: SupportView) => {
    if (view) setSupportView(view)
    setDesktopTab(next)
    if (next !== 'about') setTab(next as TabId)
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

  /** Shared screen content (tabs common to both mobile + desktop) */
  const appScreens = (
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
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (< lg)
          Fix: h-dvh (not min-h-dvh) so flex-1 is bounded and scroll works
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#efedf6,transparent_60%),radial-gradient(ellipse_at_bottom_right,#f7e9eb,transparent_55%)] lg:hidden">
        <main ref={mobileScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {appScreens}
        </main>

        <BottomNav active={tab} onChange={(t) => navigate(t)} />

        {/* Mobile emergency sheet — absolute inside phone height */}
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="pointer-events-auto h-full">
            <EmergencySheet
              open={sosOpen}
              onClose={closeSos}
              onSubmit={(data) => {
                setRequest({ ...data, id: crypto.randomUUID(), status: 'pending', helper: null })
                setSosOpen(false)
              }}
            />
          </div>
        </div>

        {onboarding ? <Onboarding onFinish={() => setOnboarding(false)} /> : null}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (≥ lg)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#efedf6,transparent_60%),radial-gradient(ellipse_at_bottom_right,#f7e9eb,transparent_55%)] lg:flex">
        {/* Top navbar with About link */}
        <DesktopNav active={desktopTab} onChange={navigateDesktop} onOpenSos={() => setSosOpen(true)} />

        {/* Body */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-8 xl:px-10">
          {/* Left sidebar */}
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-24 space-y-5">
              <div className="rounded-2xl bg-sage-soft p-4 text-sm leading-relaxed text-sage-strong">
                🔒 Private by design. Encrypted. Never sold.
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick links</p>
                <ul className="space-y-1 text-sm">
                  {(
                    [
                      { id: 'cycle' as DesktopTabId, label: 'View your cycle' },
                      { id: 'support' as DesktopTabId, label: 'Get a pad now' },
                      { id: 'assistant' as DesktopTabId, label: 'Ask PeriodLens' },
                      { id: 'about' as DesktopTabId, label: 'About HERFLOW' },
                    ] as { id: DesktopTabId; label: string }[]
                  ).map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => navigateDesktop(l.id)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main content panel */}
          <div
            ref={desktopScrollRef}
            className="min-w-0 flex-1 overflow-y-auto rounded-3xl border border-border/60 bg-background shadow-[0_4px_32px_-8px_rgba(41,40,50,0.1)]"
            style={{ maxHeight: 'calc(100dvh - 7rem)' }}
          >
            {/* About page (desktop-only) */}
            {desktopTab === 'about' ? (
              <AboutScreen onNavigate={(t) => navigateDesktop(t)} />
            ) : (
              appScreens
            )}
          </div>
        </div>

        {/* Desktop emergency sheet — centered modal */}
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
