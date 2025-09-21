
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/icons/logo';
import { LogOut, User, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import React, { useEffect } from 'react';
import { requestNotificationPermission, saveMessagingDeviceToken } from '@/lib/firebase-messaging';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, where, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();

  const alertsRef = user ? collection(db, 'users', user.uid, 'alerts') : null;
  const unreadQuery = alertsRef ? query(alertsRef, where('isRead', '==', false)) : null;
  const [unreadAlerts] = useCollection(unreadQuery);
  const unreadCount = unreadAlerts?.docs.length || 0;


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  useEffect(() => {
    if (user) {
        requestNotificationPermission().then(permission => {
            if (permission === 'granted') {
                saveMessagingDeviceToken(user.uid);
            }
        });
    }
  }, [user]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 w-full bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground font-headline">Flous Dart</span>
          </Link>
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/dashboard/alerts">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Voir les alertes</span>
                </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{user.displayName || 'Utilisateur'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem asChild>
                  <Link href="/dashboard/alerts" className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Alertes</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
