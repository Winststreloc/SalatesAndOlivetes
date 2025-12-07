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
      setDsnStatus(`✅ DSN установлен: ${dsn.substring(0, 30)}...`)
    } else {
      setDsnStatus('❌ DSN НЕ установлен! Установите NEXT_PUBLIC_SENTRY_DSN в Vercel')
    }
  }

  const testMessage = () => {
    try {
      const messageId = Sentry.captureMessage('Test message from test page', {
        level: 'info',
        tags: {
          test: true,
          source: 'test_page',
        },
        extra: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
        },
      })
      setStatus(`✅ Сообщение отправлено! ID: ${messageId}`)
      console.log('✅ Test message sent, ID:', messageId)
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
    const client = Sentry.getClient()
    if (client) {
      setStatus(`✅ Sentry клиент инициализирован: ${client.getDsn()?.host || 'unknown'}`)
    } else {
      setStatus('❌ Sentry клиент НЕ инициализирован!')
    }
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
            <h3 className="font-semibold mb-2">Если не работает:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Проверьте, что NEXT_PUBLIC_SENTRY_DSN установлен в Vercel</li>
              <li>Убедитесь, что переменная доступна для Production окружения</li>
              <li>Проверьте консоль браузера на наличие ошибок</li>
              <li>Отключите блокировщики рекламы (они могут блокировать Sentry)</li>
              <li>Проверьте Network tab в DevTools - должны быть запросы к sentry.io</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

