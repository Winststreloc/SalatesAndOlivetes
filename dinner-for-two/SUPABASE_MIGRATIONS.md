# Применение миграций Supabase

## Проблема
Если вы видите ошибку: `Could not find the table 'public.weekly_plans' in the schema cache`, это означает, что миграции базы данных не были применены.

## Решение

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (в левом меню)
4. Нажмите **New Query**
5. Скопируйте содержимое файла `supabase/migration_all.sql`
6. Вставьте в редактор
7. Нажмите **Run** (или Ctrl+Enter)

### Вариант 2: Через Supabase CLI

Если у вас установлен Supabase CLI:

```bash
cd dinner-for-two
supabase db push
```

Или примените миграцию напрямую:

```bash
supabase db execute -f supabase/migration_all.sql
```

## Что создается

Миграция создает две таблицы:

1. **dish_cache** - для кэширования AI-результатов (рецепты и ингредиенты)
2. **weekly_plans** - для сохранения истории недельных планов

## Проверка

После применения миграции проверьте:

1. В Supabase Dashboard перейдите в **Table Editor**
2. Убедитесь, что таблицы `dish_cache` и `weekly_plans` появились
3. Перезапустите приложение

## Примечание

Если у вас уже есть данные в базе, миграция использует `create table if not exists`, поэтому она безопасна для повторного применения.

