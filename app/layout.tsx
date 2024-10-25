'use client'

import './globals.css'
import { Inter } from 'next/font/google'
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@nextui-org/react"
import NextLink from 'next/link'
import { NextUIProvider } from '@nextui-org/react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../firebase/clientApp'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/clientApp'


const inter = Inter({ subsets: ['latin'] })

const updateUserLastActivity = async () => {
  const updateLastActivityFunction = httpsCallable(functions, 'updateUserLastActivity');
  try {
    await updateLastActivityFunction();
  } catch (error) {
    console.error('Error updating activity:', error);
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      let timeout: NodeJS.Timeout;
      updateUserLastActivity();

      const handleActivity = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          updateUserLastActivity();
        }, 5000);
      };

      const events = [
        'mousedown',
        'keydown',
        'scroll',
        'touchstart',
        'click',
        'mousemove'
      ];

      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
        clearTimeout(timeout);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
    setIsMenuOpen(false);
  };

  const menuItems = [
    { label: 'Home', href: '/', requireAuth: false },
    { label: 'Dashboard', href: '/dashboard', requireAuth: true },
    { label: 'Profile', href: '/profile', requireAuth: true },
  ];

  if (!mounted || loading) return null;

  return (
    <html lang="en">
      <body className={inter.className}>
        <NextUIProvider>
          <Navbar 
            shouldHideOnScroll
            isBordered
            isMenuOpen={isMenuOpen}
            onMenuOpenChange={setIsMenuOpen}
          >
            <NavbarContent className="sm:hidden" justify="start">
              <NavbarMenuToggle />
            </NavbarContent>

            <NavbarContent>
              <NavbarBrand>
                <p className="font-bold text-inherit">MoveOut</p>
              </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden sm:flex gap-4" justify="center">
              {menuItems.map((item) => (
                !item.requireAuth || user ? (
                  <NavbarItem key={item.href}>
                    <Link 
                      as={NextLink} 
                      color="foreground" 
                      href={item.href}
                      className="w-full"
                    >
                      {item.label}
                    </Link>
                  </NavbarItem>
                ) : null
              ))}
            </NavbarContent>

            <NavbarContent justify="end">
              {user ? (
                <NavbarItem>
                  <Button 
                    color="primary" 
                    onClick={handleLogout}
                    className="hidden sm:flex"
                  >
                    Logout
                  </Button>
                </NavbarItem>
              ) : (
                <>
                  <NavbarItem className="hidden sm:flex">
                    <Link as={NextLink} href="/auth/login">Login</Link>
                  </NavbarItem>
                  <NavbarItem className="hidden sm:flex">
                    <Button 
                      as={NextLink} 
                      color="primary" 
                      href="/auth/signup" 
                      variant="flat"
                    >
                      Sign Up
                    </Button>
                  </NavbarItem>
                </>
              )}
            </NavbarContent>

            <NavbarMenu>
              {menuItems.map((item) => (
                !item.requireAuth || user ? (
                  <NavbarMenuItem key={item.href}>
                    <Link
                      as={NextLink}
                      color="foreground"
                      href={item.href}
                      className="w-full"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </NavbarMenuItem>
                ) : null
              ))}
              {user ? (
                <NavbarMenuItem>
                  <Button 
                    color="primary" 
                    onClick={handleLogout}
                    className="w-full"
                  >
                    Logout
                  </Button>
                </NavbarMenuItem>
              ) : (
                <>
                  <NavbarMenuItem>
                    <Link 
                      as={NextLink} 
                      href="/auth/login"
                      className="w-full"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                  </NavbarMenuItem>
                  <NavbarMenuItem>
                    <Button
                      as={NextLink}
                      color="primary"
                      href="/auth/signup"
                      variant="flat"
                      className="w-full"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Button>
                  </NavbarMenuItem>
                </>
              )}
            </NavbarMenu>
          </Navbar>

          <main className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 md:p-16 lg:p-24">
            {children}
          </main>
        </NextUIProvider>
      </body>
    </html>
  )
}