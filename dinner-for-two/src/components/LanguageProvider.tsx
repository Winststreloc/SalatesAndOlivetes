'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'ru'

const translations = {
  en: {
    startNew: "Start a new Couple",
    or: "- OR -",
    enterCode: "Enter Invite Code",
    join: "Join",
    welcome: "Welcome to Dinner for Two",
    shareCode: "Share this code with your partner:",
    waiting: "Waiting for partner...",
    refresh: "Refresh",
    planMenu: "Weekly Menu",
    shoppingList: "Shopping List",
    addDishPlaceholder: "Dish name (e.g. Pasta)",
    add: "Add",
    noDishes: "No dishes yet. Add one!",
    selectDishesHint: "Select dishes in the Plan tab to generate a list.",
    openInTg: "Please open this app in Telegram",
    invalidCode: "Invalid code",
    failedJoin: "Failed to join",
    failedAdd: "Failed to add dish",
    loading: "...",
    inviteCode: "Your Invite Code",
    delete: "Delete",
    close: "Close",
    shareLink: "Send to Partner",
    copied: "Copied!",
    generating: "Generating recipe...",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    addForDay: "Add for",
    ideas: "Ideas",
    settings: "Settings",
    sides: "Preferred Sides",
    proteins: "Preferred Proteins",
    save: "Save",
    generateIdeas: "Generate Ideas based on preferences",
    noIdeas: "No ideas generated yet. Setup preferences and click Generate!",
    useIdea: "Use",
    buckwheat: "Buckwheat",
    pasta: "Pasta",
    rice: "Rice",
    potato: "Potatoes",
    chicken: "Chicken",
    beef: "Beef",
    pork: "Pork",
    fish: "Fish",
    select: "Select"
  },
  ru: {
    startNew: "Создать пару",
    or: "- ИЛИ -",
    enterCode: "Введите код приглашения",
    join: "Присоединиться",
    welcome: "Ужин на двоих",
    shareCode: "Отправьте этот код партнеру:",
    waiting: "Ждем партнера...",
    refresh: "Обновить",
    planMenu: "Меню на неделю",
    shoppingList: "Список покупок",
    addDishPlaceholder: "Название блюда (напр. Борщ)",
    add: "Добавить",
    noDishes: "Пока нет блюд. Добавьте что-нибудь!",
    selectDishesHint: "Выберите блюда во вкладке Меню, чтобы создать список.",
    openInTg: "Пожалуйста, откройте приложение в Telegram",
    invalidCode: "Неверный код",
    failedJoin: "Не удалось присоединиться",
    failedAdd: "Не удалось добавить блюдо",
    loading: "...",
    inviteCode: "Ваш код приглашения",
    delete: "Удалить",
    close: "Закрыть",
    shareLink: "Отправить партнеру",
    copied: "Скопировано!",
    generating: "Ищем ингредиенты...",
    days: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
    addForDay: "Добавить на",
    ideas: "Идеи",
    settings: "Настройки",
    sides: "Любимые гарниры",
    proteins: "Любимое мясо/рыба",
    save: "Сохранить",
    generateIdeas: "Сгенерировать идеи по вкусу",
    noIdeas: "Нет идей. Настройте предпочтения и нажмите Сгенерировать!",
    useIdea: "Взять",
    buckwheat: "Гречка",
    pasta: "Макароны",
    rice: "Рис",
    potato: "Картошка",
    chicken: "Курица",
    beef: "Говядина",
    pork: "Свинина",
    fish: "Рыба",
    select: "Выбрать"
  }
}

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: typeof translations['en']
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ru') 

  useEffect(() => {
    // 1. Check localStorage
    const saved = localStorage.getItem('dft-lang') as Language
    if (saved && (saved === 'ru' || saved === 'en')) {
        setLangState(saved)
        return
    }

    // 2. Check Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
        const tgLang = window.Telegram.WebApp.initDataUnsafe.user.language_code
        if (tgLang === 'ru' || tgLang.startsWith('ru-')) {
            setLangState('ru')
        } else {
            setLangState('en')
        }
    }
  }, [])

  const setLang = (l: Language) => {
      setLangState(l)
      localStorage.setItem('dft-lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
