
'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';

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
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Mon Profil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-12">
          <Avatar className="h-32 w-32">
             <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-16 w-16" />
              </AvatarFallback>
          </Avatar>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">{user.displayName || 'Utilisateur'}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="text-center text-sm text-muted-foreground">
             <p>Membre depuis le {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : 'N/A'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
