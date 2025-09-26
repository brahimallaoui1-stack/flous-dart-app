
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, HelpCircle, Palette, Monitor, Moon, Sun, UserCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const [user, loading] = useAuthState(auth);
  const router = useRouter();



  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </Button>
      <div className="space-y-8">
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <Palette className="h-6 w-6" />
                    Apparence
                </CardTitle>
                <CardDescription>
                    Personnalisez l'apparence de l'application.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <h3 className="font-medium">Thème</h3>
                        <p className="text-sm text-muted-foreground">
                            Choisissez entre le mode clair, sombre ou système.
                        </p>
                    </div>
                     <Select onValueChange={setTheme} defaultValue={theme}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Choisir un thème" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            Clair
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                           <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            Sombre
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                           <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Système
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <HelpCircle className="h-6 w-6" />
                    Comment ça marche ?
                </CardTitle>
                 <CardDescription>
                    Consultez notre guide pour comprendre le fonctionnement de l'application.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Button asChild>
                    <Link href="/how-it-works">Voir le guide</Link>
                 </Button>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
