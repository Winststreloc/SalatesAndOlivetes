'use client'
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PairingScreen() {
  const { createCouple, joinCouple } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const handleCreate = async () => {
    const couple = await createCouple()
    if (couple) {
        setCreatedCode(couple.invite_code)
    }
  }

  const handleJoin = async () => {
    try {
        await joinCouple(inviteCode)
    } catch (e) {
        alert('Invalid code')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 items-center justify-center h-screen bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
           <CardTitle>Welcome to Dinner for Two</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
           {!createdCode ? (
             <>
               <Button onClick={handleCreate} className="w-full">Start a new Couple</Button>
               <div className="text-center text-sm text-gray-500">- OR -</div>
               <div className="flex gap-2">
                 <Input 
                   placeholder="Enter Invite Code" 
                   value={inviteCode} 
                   onChange={(e) => setInviteCode(e.target.value)} 
                 />
                 <Button variant="outline" onClick={handleJoin}>Join</Button>
               </div>
             </>
           ) : (
             <div className="text-center">
               <p className="mb-2">Share this code with your partner:</p>
               <div className="p-4 bg-gray-100 rounded font-mono select-all text-lg font-bold">
                 {createdCode}
               </div>
               <p className="text-xs text-gray-500 mt-4">Waiting for partner...</p>
               <Button className="mt-4" variant="ghost" onClick={() => window.location.reload()}>Refresh</Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}


