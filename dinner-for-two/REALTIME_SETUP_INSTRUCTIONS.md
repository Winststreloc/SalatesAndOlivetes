# Инструкция по настройке Realtime (WebSockets)

## Проблема: WebSockets не работают

Если изменения не синхронизируются в реальном времени между партнерами, нужно включить Realtime для таблиц в Supabase.

## Решение

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Database** → **Replication**
4. Найдите следующие таблицы и включите Realtime для каждой:
   - ✅ `dishes`
   - ✅ `ingredients`
   - ✅ `manual_ingredients`

### Вариант 2: Через SQL Editor

1. Откройте Supabase Dashboard → **SQL Editor**
2. Выполните следующий SQL:

```sql
-- Enable Realtime for dishes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'dishes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dishes;
    END IF;
END $$;

-- Enable Realtime for ingredients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'ingredients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
    END IF;
END $$;

-- Enable Realtime for manual_ingredients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'manual_ingredients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE manual_ingredients;
    END IF;
END $$;
```

### Проверка работы

1. Откройте приложение в двух разных окнах/устройствах (или попросите партнера открыть)
2. Добавьте блюдо в одном окне
3. Оно должно автоматически появиться во втором окне без обновления страницы
4. В консоли браузера (F12) должны быть логи:
   - `📡 Realtime subscription status: SUBSCRIBED`
   - `🔔 Realtime dishes update: INSERT`
5. В верхней панели должен быть зеленый индикатор подключения (иконка Wi-Fi)

### Устранение неполадок

Если Realtime все еще не работает:

1. **Проверьте статус подключения** - в верхней панели должна быть зеленая иконка Wi-Fi
2. **Откройте консоль браузера** (F12) и проверьте логи:
   - Если видите `CHANNEL_ERROR` или `TIMED_OUT` - проверьте настройки Realtime в Supabase
   - Если видите `CLOSED` - возможно, проблема с сетью или настройками проекта
3. **Проверьте, что таблицы добавлены в публикацию**:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
   Должны быть строки для `dishes`, `ingredients` и `manual_ingredients`
4. **Проверьте переменные окружения**:
   - `NEXT_PUBLIC_SUPABASE_URL` должен быть правильным
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` должен быть правильным

### Исправленные проблемы

✅ **React Error #300** - исправлено добавлением проверки размонтирования компонента перед обновлением состояния

✅ **WebSockets не работают** - добавлена:
- Подписка на `manual_ingredients`
- Обработка ошибок подключения
- Безопасное обновление состояния
- Логирование статуса подключения

