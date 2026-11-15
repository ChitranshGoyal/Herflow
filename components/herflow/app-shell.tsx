'use client'

import { Activity, useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from './bottom-nav'
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
  const scrollRef = useRef<HTMLElement>(null)

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
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const closeSos = useCallback(() => setSosOpen(false), [])

  const requestHandlers = {
    request,
    onOpenSos: () => setSosOpen(true),
    onCompleteRequest: () => setRequest((r) => (r ? { ...r, status: 'completed' } : r)),
    onCancelRequest: () => setRequest(null),
    onDismissRequest: () => setRequest(null),
  }

  return (
    <div className="flex min-h-dvh justify-center bg-[radial-gradient(ellipse_at_top,#efedf6,transparent_60%),radial-gradient(ellipse_at_bottom_right,#f7e9eb,transparent_55%)] lg:items-center lg:gap-16 lg:p-10">
      <aside className="hidden max-w-sm lg:block">
        <p className="text-sm font-bold tracking-tight">
          HERFLOW <span className="text-primary">AI</span>
        </p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-balance">
          Smart menstrual health, built for campus life.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Private cycle tracking, one-tap emergency pad support, live dispenser availability and an AI assistant in
          English and Hindi.
        </p>
        <ul className="mt-8 space-y-3 text-sm">
          {['CycleGuard · tracking & insights', 'PeriodMate · emergency support', 'PadWatch · live availability', 'PeriodLens · AI assistant', 'Pad-to-Pad · community'].map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </aside>

      <div className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-clip bg-background lg:h-[min(880px,calc(100dvh-5rem))] lg:rounded-[2.75rem] lg:border-[10px] lg:border-foreground lg:shadow-[0_40px_80px_-30px_rgba(41,40,50,0.45)]">
        <main ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
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
    </div>
  )
}
