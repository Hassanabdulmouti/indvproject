'use client'

import './globals.css'
import { Inter } from 'next/font/google'
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button } from "@nextui-org/react";
import NextLink from 'next/link'
import { NextUIProvider } from '@nextui-org/react'
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/clientApp';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  // Render nothing on server-side or when authentication status is loading
  if (!mounted || loading) return null;

  return (
    <html lang="en">
      <body className={inter.className}>
        <NextUIProvider>
          <Navbar shouldHideOnScroll>
            <NavbarBrand>
              <p className="font-bold text-inherit">MoveOut</p>
            </NavbarBrand>
            <NavbarContent className="hidden sm:flex gap-4" justify="center">
              <NavbarItem>
                <Link as={NextLink} color="foreground" href="/">
                  Home
                </Link>
              </NavbarItem>
              {user && (
                <>
                  <NavbarItem>
                    <Link as={NextLink} color="foreground" href="/dashboard">
                      Dashboard
                    </Link>
                  </NavbarItem>
                  <NavbarItem>
                    <Link as={NextLink} color="foreground" href="/profile">
                      Profile
                    </Link>
                  </NavbarItem>
                </>
              )}
            </NavbarContent>
            <NavbarContent justify="end">
              {user ? (
                <NavbarItem>
                  <Button color="primary" onClick={handleLogout}>
                    Logout
                  </Button>
                </NavbarItem>
              ) : (
                <>
                  <NavbarItem className="hidden lg:flex">
                    <Link as={NextLink} href="/auth/login">Login</Link>
                  </NavbarItem>
                  <NavbarItem>
                    <Button as={NextLink} color="primary" href="/auth/signup" variant="flat">
                      Sign Up
                    </Button>
                  </NavbarItem>
                </>
              )}
            </NavbarContent>
          </Navbar>
          <main className="flex min-h-screen flex-col items-center justify-between p-24">
            {children}
          </main>
        </NextUIProvider>
      </body>
    </html>
  )
}
