import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/logo';
import { Separator } from '@/components/ui/separator';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 12.5a3.5 3.5 0 0 0 3.5-3.5h-7a3.5 3.5 0 1 1 7 0c0 1.503-.904 2.79-2.182 3.322" />
      </svg>
    );
}

export default function LoginPage() {
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="exemple@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            <Link href="/dashboard">Connexion</Link>
          </Button>
          <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-card px-2 text-sm text-muted-foreground">OU</span>
          </div>
          <Button variant="outline" className="w-full">
            <GoogleIcon className="mr-2 h-4 w-4" />
            Se connecter avec Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Vous n'avez pas de compte?{' '}
            <Link href="/signup" className="underline text-primary hover:text-primary/80">
              Créer un compte
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
