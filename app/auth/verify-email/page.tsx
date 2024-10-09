'use client'

import { useState, useEffect } from 'react';
import { auth } from "@/firebase/clientApp"
import { sendEmailVerification, applyActionCode } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmailVerification() {
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyEmail = async () => {
      const actionCode = new URLSearchParams(window.location.search).get('oobCode');
      if (actionCode) {
        setVerifying(true);
        try {
          await applyActionCode(auth, actionCode);
          setVerified(true);
        } catch (error) {
          setError((error as Error).message);
        } finally {
          setVerifying(false);
        }
      }
    };

    verifyEmail();
  }, []);

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        alert('Verification email sent. Please check your inbox.');
      } catch (error) {
        setError((error as Error).message);
      }
    } else {
      setError('No user is currently signed in.');
    }
  };

  if (verifying) {
    return <p>Verifying your email...</p>;
  }

  if (verified) {
    return (
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Email Verified</CardTitle>
          <CardDescription>
            Your email has been successfully verified. You can now use all features of the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Email Verification Required</CardTitle>
        <CardDescription>
          Please verify your email address to access all features of the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={handleResendVerification}>Resend Verification Email</Button>
      </CardContent>
    </Card>
  );
}
