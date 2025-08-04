
'use client';

import Link from 'next/link';
import { PlusCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import React from 'react';

// This will be replaced by data fetched from your database
const userGroups: any[] = [];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Espace Membre</h1>
        <Button asChild>
          <Link href="/dashboard/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer une nouvelle association
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 md:order-last">
            <h2 className="text-2xl font-semibold mb-4">Mes associations</h2>
            {userGroups.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                    {userGroups.map((group) => (
                    <Link href={`/dashboard/groups/${group.id}`} key={group.id} className="block hover:scale-[1.02] transition-transform duration-200">
                        <Card className="h-full flex flex-col shadow-md hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <CardTitle>{group.name}</CardTitle>
                            <CardDescription>Prochain bénéficiaire: {group.nextBeneficiary}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="mr-2 h-4 w-4" />
                            <span>{group.members} membres</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Badge variant={group.status === 'En cours' ? 'default' : 'secondary'} className={group.status === 'En cours' ? 'bg-green-500 text-white' : ''}>
                            {group.status}
                            </Badge>
                        </CardFooter>
                        </Card>
                    </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 px-6 bg-card rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-2">Bienvenue !</h3>
                    <p className="text-muted-foreground mb-4">Vous ne faites partie d'aucune association pour le moment.</p>
                    <p className="text-muted-foreground">Créez-en une ou rejoignez un groupe existant avec un code d'invitation.</p>
                </div>
            )}
        </div>

        <div className="md:order-first">
            <h2 className="text-2xl font-semibold mb-4">Rejoindre une association</h2>
            <Card className="shadow-md">
                <CardHeader>
                <CardTitle>Code d'invitation</CardTitle>
                <CardDescription>Saisissez le code pour rejoindre un groupe existant.</CardDescription>
                </CardHeader>
                <CardContent>
                <Input placeholder="Entrez le code..." />
                </CardContent>
                <CardFooter>
                <Button className="w-full">Rejoindre l'association</Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
