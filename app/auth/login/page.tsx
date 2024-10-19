'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { auth, googleProvider } from "@/firebase/clientApp"
import { Icons } from "@/components/ui/icons"
import { useRouter } from 'next/navigation'
import { getUserDetails, reactivateAccount } from '@/firebase/dbOp'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const userData = await getUserDetails(user.uid)

      if (!userData.isActive) {
        if (confirm('Your account is deactivated. Would you like to reactivate it?')) {
          await reactivateAccount(user.uid)
          console.log('Account reactivated')
        } else {
          await auth.signOut()
          setError('Login cancelled. Account remains deactivated.')
          setIsLoading(false)
          return
        }
      }

      console.log('Logged in successfully')
      router.push('/')
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      const userData = await getUserDetails(user.uid)

      if (!userData.isActive) {
        if (confirm('Your account is deactivated. Would you like to reactivate it?')) {
          await reactivateAccount(user.uid)
          console.log('Account reactivated')
        } else {
          await auth.signOut()
          setError('Login cancelled. Account remains deactivated.')
          setIsLoading(false)
          return
        }
      }

      console.log('Logged in with Google successfully')
      router.push('/')
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            'Logging in...'
          ) : (
            <>
              <Icons.google className="mr-2 h-4 w-4" />
              Login with Google
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}