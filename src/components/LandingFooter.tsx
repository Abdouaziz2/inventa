import { Diamond } from 'lucide-react';

export default function LandingFooter() {
  const handleNavClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // These are placeholder links for now - implement actual navigation as needed
  };

  return (
    <footer className="py-12 border-t border-border/50 bg-background/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Diamond className="h-6 w-6 text-gold" />
              <span className="font-bold">Inventa</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Plateforme de gestion pour bijouteries modernes.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition">Fonctionnalités</a></li>
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Tarification</button></li>
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Sécurité</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Blog</button></li>
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Support</button></li>
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Contact</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Mentions légales</button></li>
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">Confidentialité</button></li>
              <li><button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer font-inherit text-inherit">CGU</button></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>&copy; 2026 Inventa. Tous droits réservés.</p>
          <div className="flex gap-4">
            <button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer" aria-label="Twitter">Twitter</button>
            <button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer" aria-label="LinkedIn">LinkedIn</button>
            <button onClick={handleNavClick} className="hover:text-foreground transition bg-none border-none p-0 cursor-pointer" aria-label="Facebook">Facebook</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
