# Применение миграций базы данных

Для работы новых функций необходимо применить миграции в Supabase.

## Миграции для применения:

### 1. История недель (weekly_plans)
Файл: `migration_weekly_history.sql`

### 2. Кэш AI результатов (dish_cache)
Файл: `migration_ai_cache.sql`

### 3. Нормализация хранения (weekly_plans + dish_cache)
Файл: `migration_normalization.sql`
> Запускайте после предыдущих миграций: переносит JSON-поля в нормализованные таблицы `weekly_plan_dishes`, `weekly_plan_ingredients`, `dish_cache_ingredients` и удаляет устаревшие колонки.

## Как применить:

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте содержимое каждого файла миграции
4. Выполните SQL запросы по очереди

## Альтернативный способ (через Supabase CLI):

```bash
supabase db push
```

Или примените миграции вручную через SQL Editor в Supabase Dashboard.

