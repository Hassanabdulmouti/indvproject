'use client'

import React, { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/firebase/clientApp'
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { updateUserProfile, deactivateAccount, deleteAccount, sendDeactivationEmail } from '@/firebase/dbOp'

const Profile = () => {
  const [user, loading] = useAuthState(auth)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await updateUserProfile(user.uid, {
        displayName: displayName !== user.displayName ? displayName : undefined,
        email: email !== user.email ? email : undefined,
        password: password || undefined
      })

      setNotificationMessage('Profile updated successfully')
      setIsNotificationDialogOpen(true)
    } catch (error) {
      setNotificationMessage((error as Error).message)
      setIsNotificationDialogOpen(true)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || !currentPassword) return

    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword)
      await reauthenticateWithCredential(user, credential)
      
      await deleteAccount(user.uid)
      
      setNotificationMessage('Your account has been deleted.')
      setIsNotificationDialogOpen(true)
      setTimeout(() => router.push('/'), 2000)
    } catch (error) {
      setNotificationMessage((error as Error).message)
      setIsNotificationDialogOpen(true)
    }
  }

  const handleDeactivateAccount = async () => {
    if (!user || !currentPassword) return

    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword)
      await reauthenticateWithCredential(user, credential)

      await deactivateAccount(user.uid)
      await sendDeactivationEmail(user.email!)

      setNotificationMessage('Your account has been deactivated. An email confirmation has been sent.')
      setIsNotificationDialogOpen(true)
      setTimeout(() => {
        auth.signOut()
        router.push('/login')
      }, 2000)
    } catch (error) {
      setNotificationMessage((error as Error).message)
      setIsNotificationDialogOpen(true)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!user) return <div>You must be logged in to view this page</div>

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View and update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New Password (leave blank to keep current)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit">Update Profile</Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Deactivate Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure you want to deactivate your account?</DialogTitle>
                <DialogDescription>
                  Your account will be disabled, but you can reactivate it later. Please enter your current password to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeactivateAccount}>Deactivate Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure you want to delete your account?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Please enter your current password to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
      
      {/* Notification Dialog */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification</DialogTitle>
          </DialogHeader>
          <DialogDescription>{notificationMessage}</DialogDescription>
          <DialogFooter>
            <Button onClick={() => setIsNotificationDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Profile