'use client'

import React, { ReactNode, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/firebase/clientApp';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendEmailVerification } from 'firebase/auth';
import { useActivityTracking } from '@/hooks/useActivityTracking';

interface ProtectedLayoutProps {
  children: ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
  const [user, loading, authError] = useAuthState(auth);
  const router = useRouter();
  const [sendingVerification, setSendingVerification] = useState(false);

  // Initialize activity tracking
  useActivityTracking();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleResendVerification = async () => {
    if (user && !user.emailVerified) {
      setSendingVerification(true);
      try {
        await sendEmailVerification(user);
        alert('Verification email sent. Please check your inbox.');
      } catch (error) {
        console.error('Error sending verification email:', error);
        alert('Failed to send verification email. Please try again later.');
      } finally {
        setSendingVerification(false);
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Show authentication errors
  if (authError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Authentication error: {authError.message}</AlertDescription>
      </Alert>
    );
  }

  // Return null if no user (will redirect in useEffect)
  if (!user) {
    return null;
  }

  // Show email verification prompt if email not verified
  if (!user.emailVerified) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="default">
          <AlertDescription>
            Your email is not verified. Please verify your email to access all features.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={handleResendVerification} 
          disabled={sendingVerification} 
          className="mt-4"
        >
          {sendingVerification ? 'Sending...' : 'Resend Verification Email'}
        </Button>
      </div>
    );
  }

  // If user is authenticated and email is verified, render the children
  return <>{children}</>;
};

export default ProtectedLayout;