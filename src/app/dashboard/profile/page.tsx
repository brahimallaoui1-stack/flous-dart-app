
'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png`} data-ai-hint="user avatar" />
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">{user.displayName || 'Utilisateur'}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Informations</h3>
            <div className="mt-2 space-y-1 text-sm">
               <p><span className="font-semibold">ID Utilisateur:</span> {user.uid}</p>
               <p><span className="font-semibold">Compte créé le:</span> {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : 'N/A'}</p>
               <p><span className="font-semibold">Dernière connexion:</span> {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('fr-FR') : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
