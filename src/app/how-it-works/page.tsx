
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus, Users, Repeat, Target, ShieldCheck, SkipForward } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function HowItWorksPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
       <header className="p-4 flex justify-start">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-headline text-foreground">Flous Dart</span>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-8">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour à l'accueil
            </Link>
        </Button>

        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 animate-fadeIn">Comment ça marche ?</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                Organiser vos tontines n'a jamais été aussi simple, transparent et sécurisé.
                Suivez ces étapes pour démarrer votre cycle d'épargne.
            </p>
        </div>

        <div className="grid gap-6 md:gap-8">
            <Card className="shadow-lg hover:shadow-xl transition-shadow animate-scaleIn" style={{ animationDelay: '0.4s' }}>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <UserPlus className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">1. Créez votre compte</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground pl-4 md:pl-16">
                        L'inscription est rapide et gratuite. Il vous suffit d'un nom, d'une adresse e-mail et d'un mot de passe pour créer votre espace personnel sécurisé.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow animate-scaleIn" style={{ animationDelay: '0.6s' }}>
                <CardHeader className="flex flex-row items-center gap-4">
                     <div className="bg-primary/10 p-3 rounded-full">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">2. Créez ou Rejoignez un Groupe</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground pl-4 md:pl-16">
                        <strong className="text-foreground">En tant qu'administrateur :</strong> créez un nouveau groupe en définissant le montant, la fréquence des paiements et le nombre de participants.
                        <br />
                        <strong className="text-foreground">En tant que membre :</strong> rejoignez un groupe existant en utilisant simplement un code d'invitation.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow animate-scaleIn" style={{ animationDelay: '0.8s' }}>
                <CardHeader className="flex flex-row items-center gap-4">
                     <div className="bg-primary/10 p-3 rounded-full">
                        <Repeat className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">3. Le Cycle d'Épargne Commence</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground pl-4 md:pl-16">
                        Une fois le groupe complet, le cycle démarre. L'application détermine automatiquement et de manière <strong className="text-foreground">totalement aléatoire</strong> l'ordre de passage des bénéficiaires pour garantir une équité parfaite. Cet ordre reste fixe pour tout le cycle.
                    </p>
                </CardContent>
            </Card>
            
            <Card className="shadow-lg hover:shadow-xl transition-shadow animate-scaleIn" style={{ animationDelay: '1s' }}>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <SkipForward className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">4. Suivi, Flexibilité et Transparence</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground pl-4 md:pl-16">
                       À chaque tour, suivez qui est le bénéficiaire. Pour plus de coopération, le bénéficiaire peut <strong className="text-foreground">céder sa place</strong> à un membre qui le suit dans l'ordre. Chaque bénéficiaire confirme ensuite la réception des fonds pour une transparence totale.
                    </p>
                </CardContent>
            </Card>

             <Card className="shadow-lg hover:shadow-xl transition-shadow animate-scaleIn" style={{ animationDelay: '1.2s' }}>
                <CardHeader className="flex flex-row items-center gap-4">
                     <div className="bg-primary/10 p-3 rounded-full">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">5. Un Cycle Sécurisé et Terminé</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground pl-4 md:pl-16">
                        Le cycle se poursuit jusqu'à ce que chaque membre ait été bénéficiaire une fois. Le groupe est alors marqué comme "Terminé", laissant une trace claire de toutes les opérations.
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="text-center mt-16 animate-fadeIn" style={{ animationDelay: '1.4s' }}>
            <h2 className="text-3xl font-bold font-headline mb-4">Prêt à commencer ?</h2>
            <p className="text-muted-foreground mb-6">Rejoignez des centaines d'utilisateurs qui font confiance à Flous Dart pour une gestion sereine de leur épargne.</p>
            <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/signup">Créer un compte gratuitement</Link>
            </Button>
        </div>

      </main>
    </div>
  );
}
