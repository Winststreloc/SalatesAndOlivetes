'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as Sentry from '@sentry/nextjs'

export default function TestSentryPage() {
  const [status, setStatus] = useState<string>('')
  const [dsnStatus, setDsnStatus] = useState<string>('')

  const checkDsn = () => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (dsn) {
      // Parse DSN to show more info
      try {
        const dsnUrl = new URL(dsn.replace(/^https?:\/\//, 'https://'))
        setDsnStatus(`✅ DSN установлен:
- Host: ${dsnUrl.host}
- Project ID: ${dsnUrl.pathname.split('/').pop()}
- Preview: ${dsn.substring(0, 50)}...`)
        console.log('📊 DSN Details:', {
          full: dsn,
          host: dsnUrl.host,
          projectId: dsnUrl.pathname.split('/').pop(),
        })
      } catch (e) {
        setDsnStatus(`✅ DSN установлен: ${dsn.substring(0, 50)}...`)
      }
    } else {
      setDsnStatus('❌ DSN НЕ установлен! Установите NEXT_PUBLIC_SENTRY_DSN в Vercel')
      console.error('❌ NEXT_PUBLIC_SENTRY_DSN is not set!')
    }
  }

  const testMessage = () => {
    try {
      console.log('📤 Sending test message...')
      const messageId = Sentry.captureMessage('Test message from test page', {
        level: 'info',
        tags: {
          test: true,
          source: 'test_page',
          timestamp: new Date().toISOString(),
        },
        extra: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      })
      setStatus(`✅ Сообщение отправлено! ID: ${messageId}
      
Проверьте:
1. Network tab - должен быть POST запрос к *.ingest.sentry.io
2. Sentry Dashboard → Issues или Discover
3. Поищите по тегу "test:true" или ID: ${messageId}`)
      console.log('✅ Test message sent, ID:', messageId)
      console.log('🔍 Check Network tab for POST requests to sentry.io')
    } catch (error) {
      setStatus(`❌ Ошибка при отправке: ${error}`)
      console.error('❌ Failed to send message:', error)
    }
  }

  const testError = () => {
    try {
      throw new Error('Test error from test page')
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: true,
          source: 'test_page',
        },
      })
      setStatus(`✅ Ошибка отправлена в Sentry!`)
      console.log('✅ Test error sent')
    }
  }

  const checkClient = () => {
    // Try to check if Sentry is initialized
    const client = Sentry.getClient()
    
    console.log('📊 Sentry Status Check:', {
      hasClient: !!client,
      clientDsn: client?.getDsn(),
    })
    
    if (client) {
      const dsn = client.getDsn()
      const options = client.getOptions()
      setStatus(`✅ Sentry клиент инициализирован:
- Host: ${dsn?.host || 'unknown'}
- Project ID: ${dsn?.projectId || 'unknown'}
- Environment: ${options.environment || 'not set'}
- Debug: ${options.debug ? 'enabled' : 'disabled'}
- Enabled: ${options.enabled !== false ? 'yes' : 'no'}`)
    } else {
      // Client might not be available immediately, but Sentry can still work
      // Test by sending a message - if it returns an ID, it works!
      setStatus(`⚠️ Sentry клиент не найден через getClient().
      
НО это может быть нормально! Sentry может работать даже если getClient() возвращает null.

Проверьте:
1. Отправьте тестовое сообщение - если есть ID, значит работает!
2. Проверьте Network tab - должны быть запросы к sentry.io
3. Проверьте консоль - должны быть логи [Sentry beforeSend]`)
      console.warn('⚠️ Sentry client not found via getClient(), but this might be OK')
      console.log('💡 Try sending a test message - if you get an ID, Sentry is working!')
    }
  }
  
  const checkNetwork = () => {
    setStatus(`🔍 Инструкция по проверке Network:
    
1. Откройте DevTools (F12) → Network
2. Очистите список запросов (🚫 кнопка)
3. Отфильтруйте по "sentry" или "ingest"
4. Нажмите "Отправить тестовое сообщение"
5. Должен появиться POST запрос к:
   *.ingest.sentry.io/api/.../envelope/
6. Проверьте статус ответа (должен быть 200)
7. Если запросов нет - проверьте блокировщики рекламы`)
    console.log('🔍 Network Check Instructions:')
    console.log('1. Open DevTools (F12) → Network tab')
    console.log('2. Filter by "sentry" or "ingest"')
    console.log('3. Send test message')
    console.log('4. Look for POST requests to *.ingest.sentry.io')
    console.log('5. Check response status (should be 200)')
  }

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Тестирование Sentry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button onClick={checkDsn} className="w-full">
              Проверить DSN
            </Button>
            {dsnStatus && (
              <p className="text-sm p-2 bg-gray-100 rounded">{dsnStatus}</p>
            )}
          </div>

          <div className="space-y-2">
            <Button onClick={checkClient} className="w-full">
              Проверить клиент Sentry
            </Button>
          </div>

          <div className="space-y-2">
            <Button onClick={checkNetwork} variant="outline" className="w-full">
              Инструкция: Проверить Network запросы
            </Button>
          </div>

          <div className="space-y-2">
            <Button onClick={testMessage} className="w-full">
              Отправить тестовое сообщение
            </Button>
          </div>

          <div className="space-y-2">
            <Button onClick={testError} variant="destructive" className="w-full">
              Отправить тестовую ошибку
            </Button>
          </div>

          {status && (
            <div className="p-4 bg-blue-50 rounded">
              <p className="text-sm">{status}</p>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Инструкции:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Откройте консоль браузера (F12 → Console)</li>
              <li>Нажмите "Проверить DSN" - должно показать, установлен ли DSN</li>
              <li>Нажмите "Проверить клиент Sentry" - должно показать статус инициализации</li>
              <li>Нажмите "Отправить тестовое сообщение" - должно отправить сообщение в Sentry</li>
              <li>Проверьте в Sentry Dashboard → Issues, должно появиться сообщение</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded">
            <h3 className="font-semibold mb-2">Если сообщения не появляются в Sentry:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li><strong>Проверьте DSN:</strong> Нажмите "Проверить DSN" и убедитесь, что он установлен и правильный</li>
              <li><strong>Проверьте Network запросы:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Откройте DevTools (F12) → Network</li>
                  <li>Отфильтруйте по "sentry" или "ingest"</li>
                  <li>Отправьте тестовое сообщение</li>
                  <li>Должны появиться POST запросы к <code>*.ingest.sentry.io</code></li>
                  <li>Проверьте статус ответа (должен быть 200)</li>
                </ul>
              </li>
              <li><strong>Проверьте консоль:</strong> Должны быть логи:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><code>📤 [Sentry beforeSend] Event:</code> - событие готовится к отправке</li>
                  <li><code>✅ [Sentry beforeSend] Event will be sent</code> - событие будет отправлено</li>
                  <li>Если видите <code>🚫 [Sentry beforeSend] Filtering out</code> - событие фильтруется</li>
                </ul>
              </li>
              <li><strong>Проверьте Sentry Dashboard:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Убедитесь, что вы смотрите правильный проект</li>
                  <li>Проверьте фильтры (может быть установлен фильтр по времени/окружению)</li>
                  <li>Попробуйте поискать по тегу <code>test:true</code></li>
                  <li>Проверьте раздел "Discover" вместо "Issues"</li>
                </ul>
              </li>
              <li><strong>Другие причины:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Отключите блокировщики рекламы (uBlock, AdBlock и т.д.)</li>
                  <li>Проверьте, что DSN правильный (должен начинаться с <code>https://</code>)</li>
                  <li>Убедитесь, что переменная доступна для Production окружения в Vercel</li>
                  <li>Проверьте, что проект в Sentry активен и не заблокирован</li>
                </ul>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

