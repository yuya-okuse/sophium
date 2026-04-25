import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MQL = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MQL)
  mql.addEventListener("change", onStoreChange)
  window.addEventListener("resize", onStoreChange)
  return () => {
    mql.removeEventListener("change", onStoreChange)
    window.removeEventListener("resize", onStoreChange)
  }
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
}
