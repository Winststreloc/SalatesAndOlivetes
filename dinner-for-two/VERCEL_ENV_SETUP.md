# Настройка переменных окружения в Vercel

Если вы получаете ошибку **"Unauthorized"**, проверьте, что все переменные окружения установлены правильно.

## Обязательные переменные окружения:

### 1. Supabase
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret_key
```

**Важно:** `SUPABASE_JWT_SECRET` должен быть **одинаковым** для создания и проверки JWT токенов. 
Можно использовать любой случайный секретный ключ (например, сгенерированный через `openssl rand -base64 32`).

### 2. Telegram
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 3. Google Gemini AI
```
GOOGLE_API_KEY=your_google_api_key
```

### 4. Sentry (Optional but Recommended for Error Monitoring)
```
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org_slug
SENTRY_PROJECT=your_sentry_project_slug
SENTRY_AUTH_TOKEN=your_sentry_auth_token (optional, for source maps upload)
```

## Как проверить в Vercel:

1. Откройте ваш проект в [Vercel Dashboard](https://vercel.com)
2. Перейдите в **Settings** → **Environment Variables**
3. Убедитесь, что все переменные установлены для всех окружений (Production, Preview, Development)

## Как проверить логи:

1. В Vercel Dashboard откройте **Deployments**
2. Выберите последний деплой
3. Откройте **Functions** → выберите функцию, которая выдает ошибку
4. Проверьте логи на наличие сообщений:
   - `getUserFromSession: No session token found` - пользователь не авторизован
   - `getUserFromSession: SUPABASE_JWT_SECRET is not set` - не установлен JWT секрет
   - `getUserFromSession: Token verification failed` - токен невалиден (возможно, секрет не совпадает)
   - `User has no couple_id` - пользователь не создал/не присоединился к паре

## Типичные проблемы:

### Ошибка: "Unauthorized: Please log in"
- **Причина:** Пользователь не авторизован или сессия истекла
- **Решение:** Убедитесь, что пользователь открывает приложение через Telegram Mini App

### Ошибка: "Unauthorized: Please create or join a couple first"
- **Причина:** Пользователь авторизован, но не в паре
- **Решение:** Пользователь должен создать пару или присоединиться к существующей через invite code

### Ошибка: "Token verification failed"
- **Причина:** `SUPABASE_JWT_SECRET` не установлен или не совпадает между созданием и проверкой токена
- **Решение:** Установите `SUPABASE_JWT_SECRET` в Vercel и убедитесь, что он одинаковый везде

