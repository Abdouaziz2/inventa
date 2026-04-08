import { Loader2 } from "lucide-react";

type AppSpinnerProps = {
  fullScreen?: boolean;
};

const AppSpinner = ({ fullScreen = false }: AppSpinnerProps) => (
  <div className={fullScreen ? "min-h-screen flex items-center justify-center" : "flex items-center justify-center py-12"}>
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export default AppSpinner;
