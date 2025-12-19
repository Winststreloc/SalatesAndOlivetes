import { toast } from 'sonner'

// Avoid calling toast in SSR / server actions
const isBrowser = typeof window !== 'undefined'

// Some environments (SSR / build) may not have toast methods attached; guard usage
function callSafe(method: any, fallback: any, message: string) {
  if (!isBrowser) return
  try {
    if (typeof method === 'function') {
      return method(message)
    }
    if (typeof fallback === 'function') {
      return fallback(message)
    }
  } catch (e) {
    // Last resort: log to console to avoid crashing
    console.error(e)
  }
}

export const showToast = {
  success: (message: string) => callSafe((toast as any)?.success, toast as any, message),
  error: (message: string) => callSafe((toast as any)?.error, toast as any, message),
  info: (message: string) => callSafe((toast as any)?.info, toast as any, message),
  warning: (message: string) => callSafe((toast as any)?.warning, toast as any, message),
}

