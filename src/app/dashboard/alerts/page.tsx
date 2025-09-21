
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell } from 'lucide-react';

export default function AlertsPage() {

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour au tableau de bord
            </Link>
        </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Centre d'alertes
          </CardTitle>
          <CardDescription>
            Toutes vos notifications importantes sont regroupées ici.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-10 px-6 text-muted-foreground">
                <Bell className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold">Aucune nouvelle alerte</p>
                <p>Vos notifications apparaîtront ici dès qu'il y aura du nouveau.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
