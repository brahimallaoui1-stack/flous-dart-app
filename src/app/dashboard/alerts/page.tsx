
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, UserPlus, CheckCircle, Users, SkipForward, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import React from 'react';

// This is placeholder data. In a real application, this would come from Firestore.
const alerts = [
  {
    id: 1,
    icon: <UserPlus className="h-5 w-5 text-blue-500" />,
    title: 'Nouveau membre !',
    description: 'Brahim Allaoui a rejoint votre groupe "Tontine des entrepreneurs".',
    time: 'il y a 5 minutes',
    read: false,
  },
  {
    id: 2,
    icon: <Users className="h-5 w-5 text-purple-500" />,
    title: 'Groupe complet !',
    description: 'Le groupe "Tontine des entrepreneurs" est maintenant complet. L\'ordre de passage va être généré.',
    time: 'il y a 1 heure',
    read: false,
  },
  {
    id: 3,
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    title: 'Paiement confirmé',
    description: 'Fatima a confirmé la réception des fonds pour le tour 3 du groupe "Famille Unie".',
    time: 'il y a 2 heures',
    read: true,
  },
  {
    id: 4,
    icon: <Info className="h-5 w-5 text-yellow-500" />,
    title: 'C\'est votre tour !',
    description: 'Félicitations, c\'est à votre tour de recevoir les fonds pour le groupe "Tontine des entrepreneurs".',
    time: 'il y a 1 jour',
    read: true,
  },
    {
    id: 5,
    icon: <SkipForward className="h-5 w-5 text-orange-500" />,
    title: 'Changement de tour',
    description: 'Ali a cédé son tour à Kenza dans le groupe "Projets 2024".',
    time: 'il y a 3 jours',
    read: true,
  },
];

export default function AlertsPage() {

    const [notifications, setNotifications] = React.useState(alerts);

    const markAsRead = (id: number) => {
        setNotifications(currentNotifications => 
            currentNotifications.map(n => n.id === id ? {...n, read: true} : n)
        );
    }
    
    const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 md:px-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-headline flex items-center">
                <Bell className="mr-3 h-6 w-6" />
                Centre d'alertes
            </CardTitle>
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount} non lue(s)</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    !alert.read ? 'bg-secondary border-primary/50' : 'bg-card'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">{alert.icon}</div>
                  <div className="flex-grow">
                    <p className="font-semibold">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                  </div>
                  {!alert.read && (
                     <Button variant="ghost" size="sm" onClick={() => markAsRead(alert.id)}>
                        Marquer comme lu
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-6 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4" />
              <p className="font-semibold">Aucune alerte pour le moment.</p>
              <p>Les nouvelles notifications apparaîtront ici.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
