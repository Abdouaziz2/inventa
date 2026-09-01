import { CheckCircle2, TrendingUp, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted?: () => void;
  onViewDemo?: () => void;
}

export default function HeroSection({ onGetStarted, onViewDemo }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Star className="h-4 w-4 text-gold fill-gold" />
                <span className="text-sm font-medium text-primary">Déjà plus de 1 200 bijouteries</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight">
                Gérez votre bijouterie <span className="text-gold">sans stress</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Stock, clients, ventes, dépôts... Centralisez tout en une seule plateforme. Gagnez 15 heures par semaine et concentrez-vous sur vos clients.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gold hover:bg-gold/90 text-gold-dark font-semibold"
                onClick={onGetStarted}
              >
                Essayer gratuitement <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={onViewDemo}
              >
                Voir la démo
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                14 jours gratuits
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Sans carte bancaire
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Setup en 5 min
              </div>
            </div>
          </div>

          {/* Right visual - Dashboard preview */}
          <div className="relative hidden md:block">
            <div className="rounded-2xl border border-border bg-card shadow-2xl p-8 backdrop-blur">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Stock total</p>
                    <h3 className="text-3xl font-bold text-foreground">1,247 pièces</h3>
                  </div>
                  <div className="rounded-full bg-success/10 p-3">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ventes ce mois</span>
                    <span className="font-semibold">+42%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 w-3/4 bg-gradient-to-r from-gold to-gold/50 rounded-full" />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">Clients actifs ce mois</p>
                  <div className="flex -space-x-2">
                    {/* Demo avatar numbers: multiply index by 3 for visual variety in mock UI */}
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-10 w-10 rounded-full bg-gradient-to-br from-gold/80 to-gold/40 border-2 border-background flex items-center justify-center text-white text-sm font-semibold"
                      >
                        {i * 3}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-gold/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
