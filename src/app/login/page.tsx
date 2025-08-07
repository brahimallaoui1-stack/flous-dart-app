
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';


export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            let errorMessage = "Une erreur est survenue lors de la connexion.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = "L'adresse e-mail ou le mot de passe est incorrect.";
            }
            toast({
                variant: "destructive",
                title: "Erreur de connexion",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             <Link href="/" aria-label="Accueil">
                <Logo className="h-12 w-12 text-primary" />
             </Link>
          </div>
          <CardTitle className="text-2xl font-headline">Connexion</CardTitle>
          <CardDescription>Entrez vos identifiants pour accéder à votre espace.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                    id="email" 
                    type="email" 
                    placeholder="exemple@email.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? "Connexion en cours..." : "Connexion"}
              </Button>
              </CardFooter>
        </form>
        <div className="px-6 pb-6 flex flex-col gap-4 text-center">
             <p className="text-sm text-muted-foreground">
                <Link href="/how-it-works" className="underline text-primary hover:text-primary/80">
                  Comment ça marche ?
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas de compte?{' '}
                <Link href="/signup" className="underline text-primary hover:text-primary/80">
                  Créer un compte
                </Link>
              </p>
        </div>
      </Card>
    </div>
  );
}
