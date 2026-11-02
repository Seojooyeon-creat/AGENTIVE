'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BellRing, BellOff, Loader2, Share, PlusSquare } from 'lucide-react'

type State = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** 키워드 공지 푸시 알림 켜기/끄기. iOS는 홈 화면에 추가한 뒤에만 푸시가 되므로 안내를 띄운다. */
export default function PushToggle() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      setState(isIOS() && !isStandalone() ? 'needs-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') return setState('denied')
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'on' : 'off'))
      .catch(() => setState('unsupported'))
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      // 권한 요청은 반드시 사용자 클릭 직후에 (iOS 요구사항)
      if ((await Notification.requestPermission()) !== 'granted') {
        setState('denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setState('on')
      toast.success('알림을 켰어요. 관심 키워드 공지가 올라오면 알려드릴게요.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '알림을 켜지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('off')
      toast('알림을 껐어요.')
    } catch {
      toast.error('알림을 끄지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return <div className="h-11 animate-shimmer rounded-xl" />

  if (state === 'needs-install') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <p className="font-semibold mb-1">iPhone에서 알림을 받으려면 홈 화면에 추가해주세요</p>
        <p className="flex items-center gap-1 flex-wrap">
          Safari 하단 <Share className="w-3.5 h-3.5 inline" /> 공유 버튼 →
          <PlusSquare className="w-3.5 h-3.5 inline" /> 홈 화면에 추가 → 추가된 앱에서 알림 켜기
        </p>
      </div>
    )
  }

  if (state === 'unsupported') {
    return <p className="text-xs text-gray-400">이 브라우저는 푸시 알림을 지원하지 않아요.</p>
  }

  if (state === 'denied') {
    return (
      <p className="text-xs text-gray-400">
        알림이 차단돼 있어요. 브라우저 설정에서 이 사이트의 알림을 허용한 뒤 다시 시도해주세요.
      </p>
    )
  }

  const on = state === 'on'
  return (
    <button
      onClick={on ? disable : enable}
      disabled={busy}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
        on
          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          : 'bg-cnu-blue text-white hover:bg-cnu-light active:scale-[0.98]'
      }`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : on ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
      {on ? '이 기기 알림 끄기' : '이 기기에서 알림 받기'}
    </button>
  )
}
