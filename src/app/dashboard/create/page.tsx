
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';

export default function CreateGroupPage() {
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
          <CardTitle className="text-2xl font-headline">Créer une nouvelle association</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous pour démarrer votre nouveau cycle d'épargne.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nom de l'association</Label>
            <Input id="group-name" placeholder="Ex: Tontine des entrepreneurs" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="contribution-amount">Montant de la contribution (en MAD)</Label>
            <Input id="contribution-amount" type="number" placeholder="Ex: 1000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="members-number">Nombre de membres</Label>
            <Input id="members-number" type="number" placeholder="Ex: 12" />
          </div>
          <div className="space-y-2">
            <Label>Fréquence des paiements</Label>
            <RadioGroup defaultValue="monthly" className="flex gap-4">
              <div>
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="ml-2 font-normal">Mensuel</Label>
              </div>
              <div>
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="ml-2 font-normal">Hebdomadaire</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full md:w-auto" asChild>
            <Link href="/dashboard/groups/1">Créer et inviter des membres</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
