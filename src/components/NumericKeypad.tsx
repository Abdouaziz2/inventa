import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
}

const NumericKeypad = ({ value, onChange }: NumericKeypadProps) => {
  const handleKey = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'clear') {
      onChange('');
    } else if (key === '000') {
      onChange(value + '000');
    } else {
      onChange(value + key);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'backspace'];

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (
        <Button
          key={key}
          type="button"
          variant="outline"
          className="h-12 text-lg font-semibold hover:bg-muted active:scale-95 transition-all"
          onClick={() => handleKey(key)}
        >
          {key === 'backspace' ? <Delete className="h-5 w-5" /> : key}
        </Button>
      ))}
    </div>
  );
};

export default NumericKeypad;
