
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
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/icons/logo';
import { LogOut, User, Bell, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { signOut } from 'firebase/auth';
import React from 'react';
import { collection, query, where, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  message: string;
  createdAt: any;
  read: boolean;
  groupId: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();

  const notificationsQuery = user
    ? query(
        collection(db, 'notifications'),
        where('adminId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
    : null;

  const [notificationsSnapshot] = useCollection(notificationsQuery);

  const notifications: Notification[] = React.useMemo(() => {
    if (!notificationsSnapshot) return [];
    return notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));
  }, [notificationsSnapshot]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
        const notifRef = doc(db, 'notifications', notification.id);
        await updateDoc(notifRef, { read: true });
    }
    router.push(`/dashboard/groups/${notification.groupId}`);
  };
  
  const clearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notification => {
        const notifRef = doc(db, "notifications", notification.id);
        batch.delete(notifRef);
    });
    await batch.commit();
  }

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">{unreadCount}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <DropdownMenuLabel>
                    <div className="flex justify-between items-center">
                        <span>Notifications</span>
                        {notifications.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="text-xs">
                                <Trash2 className="mr-1 h-3 w-3"/>
                                Vider
                            </Button>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n)} onSelect={(e) => e.preventDefault()} className={`flex flex-col items-start gap-1 cursor-pointer ${!n.read ? 'bg-secondary' : ''}`}>
                          <p className="text-sm whitespace-normal">{n.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: fr }) : ''}
                          </p>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      <p className="text-sm text-center text-muted-foreground py-4">
                        Aucune notification pour le moment.
                      </p>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

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
                    <p className="text-sm font-medium leading-none">{user.displayName || 'Utilisateur'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
