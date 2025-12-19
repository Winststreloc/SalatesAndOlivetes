'use server'

import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import {
  getDishes,
  getManualIngredients,
  getInviteCode,
  hasPartner,
  getCouplePreferences
} from '@/app/actions'

/**
 * Собирает стартовые данные для пары одним запросом,
 * чтобы снизить количество серверных вызовов при загрузке.
 */
export async function getDashboardBundle() {
  const user = await getUserFromSession()
  if (!user) {
    return {
      auth: false,
      dishes: [],
      manualIngredients: [],
      inviteCode: null,
      hasPartner: null,
      preferences: null,
    }
  }

  try {
    const [dishes, manualIngredients, inviteCode, hasPartnerFlag, preferences] = await Promise.all([
      getDishes(),
      getManualIngredients(),
      getInviteCode(),
      hasPartner(),
      getCouplePreferences(),
    ])

    return {
      auth: true,
      dishes: dishes || [],
      manualIngredients: manualIngredients || [],
      inviteCode: inviteCode || null,
      hasPartner: hasPartnerFlag ?? null,
      preferences: preferences || null,
    }
  } catch (error) {
    handleError(error as Error, createErrorContext('getDashboardBundle', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      showToast: false,
    }))
    throw error
  }
}

