
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, BellOff, CheckCheck, CircleDollarSign, Gift, UserPlus, Users } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  body: string;
  createdAt: Date;
  isRead: boolean;
  type: string;
  groupId?: string;
  groupName?: string;
}

const AlertIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'newMemberJoined':
      return <UserPlus className="h-6 w-6 text-blue-500" />;
    case 'groupIsFull':
      return <Users className="h-6 w-6 text-green-500" />;
    case 'yourTurn':
      return <Gift className="h-6 w-6 text-yellow-500" />;
    case 'paymentConfirmation':
      return <CircleDollarSign className="h-6 w-6 text-green-500" />;
    default:
      return <Bell className="h-6 w-6 text-gray-500" />;
  }
};


export default function AlertsPage() {
  const [user] = useAuthState(auth);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Removed orderBy('createdAt', 'desc') to avoid indexing issues. Sorting will be done on the client.
  const [alertsCollection, loadingCollection, error] = useCollection(
    user ? query(collection(db, 'users', user.uid, 'alerts')) : null
  );

  useEffect(() => {
    if (alertsCollection) {
      const fetchedAlerts = alertsCollection.docs.map(doc => {
        const data = doc.data();
        // Handle both Timestamp and Date objects
        const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt);
        
        return {
          id: doc.id,
          ...data,
          createdAt,
        } as Alert;
      });
      // Sort alerts on the client-side
      fetchedAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAlerts(fetchedAlerts);
    }
    setLoading(loadingCollection);
  }, [alertsCollection, loadingCollection]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unreadAlerts = alertsCollection?.docs.filter(doc => !doc.data().isRead);
    if (!unreadAlerts || unreadAlerts.length === 0) {
      toast({ description: "Toutes les alertes sont déjà lues." });
      return;
    }

    try {
      const batch = writeBatch(db);
      unreadAlerts.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
      toast({ description: "Toutes les alertes ont été marquées comme lues." });
    } catch (error) {
      console.error("Error marking all as read: ", error);
      toast({ variant: 'destructive', description: "Une erreur est survenue." });
    }
  };
  
  const hasUnreadAlerts = alerts.some(alert => !alert.isRead);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </Button>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
            <CardTitle className="text-2xl font-headline">Centre d'alertes</CardTitle>
            <CardDescription>Toutes vos notifications importantes sont regroupées ici.</CardDescription>
          </div>
          {hasUnreadAlerts && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading && <p>Chargement des alertes...</p>}
          {error && <p className="text-destructive">Erreur: Impossible de charger les alertes. Raison: {error.message}</p>}
          {!loading && alerts.length === 0 && (
            <div className="text-center py-10 px-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <BellOff className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune nouvelle alerte</h3>
              <p>Vos notifications apparaîtront ici dès qu'il y aura du nouveau.</p>
            </div>
          )}
          {!loading && alerts.length > 0 && (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border p-4 transition-colors",
                    alert.isRead ? "bg-card text-muted-foreground" : "bg-secondary"
                  )}
                >
                  <AlertIcon type={alert.type} />
                  <div className="flex-1">
                    <p className={cn("font-medium", !alert.isRead && "text-foreground")}>
                      {alert.body}
                    </p>
                    <p className="text-xs mt-1">
                      Il y a {formatDistanceToNow(alert.createdAt, { addSuffix: false, locale: fr })}
                    </p>
                  </div>
                  {!alert.isRead && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
