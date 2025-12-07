/**
 * Haptic feedback utilities for Telegram WebApp
 */

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'selection' | 'warning' | 'error' = 'light') {
  if (typeof window === 'undefined') return
  
  const webApp = (window as any).Telegram?.WebApp
  
  if (!webApp) return
  
  try {
    switch (type) {
      case 'light':
        webApp.HapticFeedback?.impactOccurred?.('light')
        break
      case 'medium':
        webApp.HapticFeedback?.impactOccurred?.('medium')
        break
      case 'heavy':
        webApp.HapticFeedback?.impactOccurred?.('heavy')
        break
      case 'rigid':
        webApp.HapticFeedback?.impactOccurred?.('rigid')
        break
      case 'soft':
        webApp.HapticFeedback?.impactOccurred?.('soft')
        break
      case 'selection':
        webApp.HapticFeedback?.selectionChanged?.()
        break
      case 'warning':
        webApp.HapticFeedback?.notificationOccurred?.('warning')
        break
      case 'error':
        webApp.HapticFeedback?.notificationOccurred?.('error')
        break
      default:
        webApp.HapticFeedback?.impactOccurred?.('light')
    }
  } catch (e) {
    // Silently fail if haptic feedback is not available
    console.debug('Haptic feedback not available:', e)
  }
}

