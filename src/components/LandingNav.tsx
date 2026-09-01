import { Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingNavProps {
  onGetStarted?: () => void;
}

export default function LandingNav({ onGetStarted }: LandingNavProps) {
  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50" aria-label="Main navigation">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Diamond className="h-8 w-8 text-gold" />
          <span className="text-xl font-bold">Inventa</span>
        </div>
        <Button variant="default" onClick={onGetStarted}>
          Commencer
        </Button>
      </div>
    </nav>
  );
}
