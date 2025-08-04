

'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, Clock, Crown, History, Settings, SkipForward, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useEffect, useState } from 'react';

// In a real app, you would fetch this data from your database based on the group ID.
const groupDetails = {
    name: 'Chargement...',
    membersCount: 0,
    contribution: 0,
    frequency: '...',
    currentRound: 0,
    totalRounds: 0,
    beneficiary: {
        name: '...',
    },
};

const members: any[] = [];

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  
  // Here you would fetch group data from your database using params.id
  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => setLoading(false), 1000);
  }, [params.id]);

  const progressPercentage = (groupDetails.totalRounds > 0) ? (groupDetails.currentRound / groupDetails.totalRounds) * 100 : 0;

  if (loading) {
      return (
          <div className="container mx-auto py-8 px-4 md:px-6">
            <p>Chargement des détails de l'association...</p>
          </div>
      )
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour à mes associations
            </Link>
        </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{groupDetails.name}</h1>
            <p className="text-muted-foreground">{groupDetails.membersCount} membres • {groupDetails.contribution}€ / {groupDetails.frequency}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline"><History className="mr-2 h-4 w-4" /> Historique</Button>
            <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Paramètres</Button>
            <Button><SkipForward className="mr-2 h-4 w-4" /> Avancer prochaine visite</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-3 shadow-md">
            <CardHeader>
                <CardTitle>Progression du cycle</CardTitle>
                <CardDescription>Visite {groupDetails.currentRound} sur {groupDetails.totalRounds}. Bénéficiaire actuel: <span className="font-semibold text-primary">{groupDetails.beneficiary.name}</span></CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={progressPercentage} className="h-4" />
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Membres de l'association</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Statut du paiement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? members.map((member, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                <User className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.role === 'Admin' && <Badge variant="destructive"><Crown className="mr-1 h-3 w-3" />Admin</Badge>}
                    {member.role === 'Membre' && <Badge variant="secondary">Membre</Badge>}
                    {member.role === 'Bénéficiaire' && <Badge variant="default" className="bg-primary text-primary-foreground">Bénéficiaire</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {member.status === 'Payé' ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-500">Payé</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-5 w-5 text-orange-500" />
                          <span className="text-orange-500">En attente</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center">Aucun membre dans cette association pour le moment.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
