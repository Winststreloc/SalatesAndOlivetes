/**
 * Utility functions for working with dates
 */

/**
 * Get array of 7 dates starting from today
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getWeekDates(startDate?: Date): string[] {
  const start = startDate || new Date()
  const dates: string[] = []
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(formatDateToISO(date))
  }
  
  return dates
}

/**
 * Format date to YYYY-MM-DD format
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date string for display with locale
 */
export function formatDate(date: string, lang: 'en' | 'ru' = 'ru'): string {
  const d = new Date(date + 'T00:00:00') // Add time to avoid timezone issues
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }
  
  if (lang === 'ru') {
    return d.toLocaleDateString('ru-RU', options)
  } else {
    return d.toLocaleDateString('en-US', options)
  }
}

/**
 * Get short date label (Today, Tomorrow, or formatted date)
 */
export function getDateLabel(date: string, lang: 'en' | 'ru' = 'ru'): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(date + 'T00:00:00')
  targetDate.setHours(0, 0, 0, 0)
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return lang === 'ru' ? 'Сегодня' : 'Today'
  } else if (diffDays === 1) {
    return lang === 'ru' ? 'Завтра' : 'Tomorrow'
  } else if (diffDays === -1) {
    return lang === 'ru' ? 'Вчера' : 'Yesterday'
  } else {
    // Format as "Monday, Nov 18" or "Понедельник, 18 ноября"
    const d = new Date(date + 'T00:00:00')
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }
    
    if (lang === 'ru') {
      return d.toLocaleDateString('ru-RU', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
    } else {
      return d.toLocaleDateString('en-US', options)
    }
  }
}

/**
 * Get short date label for buttons (Today, Tomorrow, or date)
 */
export function getDateButtonLabel(date: string, lang: 'en' | 'ru' = 'ru'): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(date + 'T00:00:00')
  targetDate.setHours(0, 0, 0, 0)
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    const label = lang === 'ru' ? 'Сегодня' : 'Today'
    const dateStr = formatDateShort(date, lang)
    return `${label} (${dateStr})`
  } else if (diffDays === 1) {
    const label = lang === 'ru' ? 'Завтра' : 'Tomorrow'
    const dateStr = formatDateShort(date, lang)
    return `${label} (${dateStr})`
  } else {
    return formatDateShort(date, lang)
  }
}

/**
 * Format date to short format (e.g., "18 ноя" or "Nov 18")
 */
function formatDateShort(date: string, lang: 'en' | 'ru' = 'ru'): string {
  const d = new Date(date + 'T00:00:00')
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  }
  
  if (lang === 'ru') {
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    })
  } else {
    return d.toLocaleDateString('en-US', options)
  }
}

/**
 * Check if date is today
 */
export function isToday(date: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(date + 'T00:00:00')
  targetDate.setHours(0, 0, 0, 0)
  
  return targetDate.getTime() === today.getTime()
}

/**
 * Check if date is in the future (after today)
 */
export function isFutureDate(date: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(date + 'T00:00:00')
  targetDate.setHours(0, 0, 0, 0)
  
  return targetDate.getTime() > today.getTime()
}

