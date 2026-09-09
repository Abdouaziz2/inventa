import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const NetworkStatus = () => {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" className="flex shrink-0 items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-xs font-semibold text-warning-foreground">
      <WifiOff className="h-4 w-4" />
      Connexion interrompue. Les données seront actualisées dès le retour du réseau.
    </div>
  );
};

export default NetworkStatus;
