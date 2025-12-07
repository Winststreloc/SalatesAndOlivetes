'use client'

import { useState, useEffect } from 'react'
import { getWeeklyPlans, saveWeeklyPlan, loadWeeklyPlan, deleteWeeklyPlan } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLang } from './LanguageProvider'
import { Calendar, Save, Loader2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function HistoryView({ currentDishes, onLoadWeek }: { currentDishes: any[], onLoadWeek: (dishes: any[]) => void }) {
  const { t } = useLang()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const data = await getWeeklyPlans()
      setPlans(data)
    } catch (e) {
      console.error('Failed to load plans:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWeek = async () => {
    if (currentDishes.length === 0) {
      alert('No dishes to save')
      return
    }

    setSaving(true)
    try {
      // Calculate week start (Monday)
      const today = new Date()
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
      const monday = new Date(today.setDate(diff))
      const weekStart = monday.toISOString().split('T')[0]

      // Save dishes with full data
      await saveWeeklyPlan(weekStart, currentDishes)
      await loadPlans()
      alert('Week saved successfully!')
    } catch (e: any) {
      console.error('Failed to save week:', e)
      alert(e.message || 'Failed to save week')
    } finally {
      setSaving(false)
    }
  }

  const handleLoadWeek = async (plan: any) => {
    setSelectedPlan(plan)
    setShowConfirm(true)
  }

  const confirmLoadWeek = async () => {
    if (!selectedPlan) return
    
    try {
      const planData = await loadWeeklyPlan(selectedPlan.id)
      onLoadWeek(planData.dishes || [])
      setShowConfirm(false)
      setSelectedPlan(null)
      alert('Week loaded successfully!')
    } catch (e: any) {
      console.error('Failed to load week:', e)
      alert(e.message || 'Failed to load week')
    }
  }

  const handleDeleteWeek = async (planId: string) => {
    if (!confirm(t.deleteWeekConfirm)) return
    
    try {
      await deleteWeeklyPlan(planId)
      await loadPlans()
    } catch (e: any) {
      console.error('Failed to delete week:', e)
      alert(e.message || 'Failed to delete week')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">{t.history}</h2>
        <Button onClick={handleSaveWeek} disabled={saving || currentDishes.length === 0} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {t.saveWeek}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.noHistory}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {t.weekOf} {formatDate(plan.week_start_date)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {Array.isArray(plan.dishes) ? plan.dishes.length : 0} {plan.dishes?.length === 1 ? 'dish' : 'dishes'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleLoadWeek(plan)}>
                    {t.loadWeek}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteWeek(plan.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Week</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will replace your current week plan. Are you sure?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                {t.close}
              </Button>
              <Button onClick={confirmLoadWeek}>
                {t.loadWeek}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

