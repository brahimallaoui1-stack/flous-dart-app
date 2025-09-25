
'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div className="container mx-auto py-8 px-4 md:px-6">Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="container mx-auto py-8 px-4 md:px-6">Veuillez vous connecter pour voir cette page.</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour au tableau de bord
            </Link>
        </Button>
      <Card className="shadow-lg overflow-hidden">
        <div className="relative h-40 w-full">
            <Image
                src="https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyMHx8bW9uZXl8ZW58MHx8fHwxNzU4ODMyODc3fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Image de couverture"
                layout="fill"
                objectFit="cover"
                data-ai-hint="green abstract pattern"
            />
        </div>
        <div className="relative -mt-16 flex flex-col items-center pb-12 pt-4 px-6">
          <Avatar className="h-32 w-32 border-4 border-card shadow-lg">
             {user.photoURL ? (
                <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />
              ) : null}
             <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-16 w-16" />
              </AvatarFallback>
          </Avatar>
          <div className="text-center mt-4">
            <h2 className="text-3xl font-bold">{user.displayName || 'Utilisateur'}</h2>
          </div>
          <div className="text-center space-y-2 mt-4 text-muted-foreground">
            <p>{user.email}</p>
            <p className="text-sm">Membre depuis le {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : 'N/A'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
