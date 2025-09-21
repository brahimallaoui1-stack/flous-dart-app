
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, CheckCheck, Loader2, Users, PartyPopper, Wallet, UserPlus } from 'lucide-react';
import { useCollection, useCollectionData } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, limit, writeBatch, where, getDocs, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

type Alert = {
    id: string;
    body: string;
    type: 'paymentConfirmation' | 'newMemberJoined' | 'groupIsFull' | 'yourTurn';
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    isRead: boolean;
    groupName: string;
    groupId: string;
};

const alertIcons = {
    paymentConfirmation: <Wallet className="h-5 w-5" />,
    newMemberJoined: <UserPlus className="h-5 w-5" />,
    groupIsFull: <PartyPopper className="h-5 w-5" />,
    yourTurn: <Users className="h-5 w-5" />,
};

const alertColors = {
    paymentConfirmation: 'text-green-500 bg-green-500/10',
    newMemberJoined: 'text-blue-500 bg-blue-500/10',
    groupIsFull: 'text-purple-500 bg-purple-500/10',
    yourTurn: 'text-yellow-500 bg-yellow-500/10',
}

const getAlertDate = (createdAt: Alert['createdAt']): Date => {
  if (createdAt instanceof Timestamp) {
    return createdAt.toDate();
  }
  // Fallback for serialized timestamp
  return new Date(createdAt.seconds * 1000);
};

export default function AlertsPage() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [isMarkingRead, setIsMarkingRead] = useState(false);
    
    const alertsRef = user ? collection(db, 'users', user.uid, 'alerts') : null;
    const alertsQuery = alertsRef ? query(alertsRef, orderBy('createdAt', 'desc'), limit(50)) : null;
    
    const [alerts, loading, error] = useCollectionData(alertsQuery, { idField: 'id' });

    const unreadAlertsCount = alerts?.filter(alert => !alert.isRead).length || 0;

    const handleMarkAllAsRead = async () => {
        if (!user || !alertsRef || unreadAlertsCount === 0) return;

        setIsMarkingRead(true);
        try {
            const unreadQuery = query(alertsRef, where('isRead', '==', false));
            const unreadSnapshot = await getDocs(unreadQuery);
            
            const batch = writeBatch(db);
            unreadSnapshot.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();

            toast({ description: "Toutes les notifications ont été marquées comme lues." });

        } catch (err) {
            console.error("Error marking alerts as read:", err);
            toast({ variant: 'destructive', description: "Une erreur est survenue." });
        } finally {
            setIsMarkingRead(false);
        }
    };
    
    return (
        <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Retour au tableau de bord
                </Link>
            </Button>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <Bell className="h-6 w-6" />
                            Centre d'alertes
                        </CardTitle>
                        <CardDescription>
                            Toutes vos notifications importantes sont regroupées ici.
                        </CardDescription>
                    </div>
                    {unreadAlertsCount > 0 && (
                         <Button onClick={handleMarkAllAsRead} disabled={isMarkingRead}>
                            {isMarkingRead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                            Marquer comme lu
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading && (
                        <div className="text-center py-10 px-6 text-muted-foreground">
                            <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" />
                            <p>Chargement des alertes...</p>
                        </div>
                    )}

                    {!loading && (!alerts || alerts.length === 0) && (
                        <div className="text-center py-10 px-6 text-muted-foreground">
                            <Bell className="mx-auto h-12 w-12 mb-4" />
                            <p className="font-semibold">Aucune nouvelle alerte</p>
                            <p>Vos notifications apparaîtront ici dès qu'il y aura du nouveau.</p>
                        </div>
                    )}

                    {!loading && alerts && alerts.length > 0 && (
                        <div className="space-y-4">
                            {(alerts as Alert[]).map(alert => (
                                <Link href={`/dashboard/groups/${alert.groupId}`} key={alert.id} className="block">
                                    <div className={cn(
                                        "flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50",
                                        !alert.isRead && "bg-secondary"
                                    )}>
                                        <div className={cn("p-2 rounded-full", alertColors[alert.type])}>
                                            {alertIcons[alert.type] || <Bell />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{alert.groupName}</p>
                                            <p className="text-sm text-muted-foreground">{alert.body}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(getAlertDate(alert.createdAt), { addSuffix: true, locale: fr })}
                                            </p>
                                        </div>
                                         {!alert.isRead && (
                                            <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1" title="Non lue"></div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                     {error && (
                         <div className="text-center py-10 px-6 text-destructive">
                            <p>Erreur: Impossible de charger les alertes.</p>
                         </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
