import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Client } from '@/features/clients';
import { cn } from '@/lib/utils';

type ClientComboboxProps = {
  clients: Client[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

const ClientCombobox = ({
  clients,
  value,
  onValueChange,
  placeholder = 'Rechercher un client...',
}: ClientComboboxProps) => {
  const [open, setOpen] = useState(false);
  const selectedClient = clients.find((client) => client.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-12 w-full justify-between gap-3 px-3 font-normal"
        >
          {selectedClient ? (
            <>
              <span className="min-w-0 truncate">{selectedClient.name}</span>
              <span className="shrink-0 text-muted-foreground">{selectedClient.phone}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Nom, téléphone ou code..." />
          <CommandList>
            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
            {clients.map((client) => (
              <CommandItem
                key={client.id}
                value={`${client.name} ${client.phone} ${client.code}`}
                onSelect={() => {
                  onValueChange(client.id);
                  setOpen(false);
                }}
                className="gap-2"
              >
                <Check className={cn('h-4 w-4 shrink-0', value === client.id ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0 flex-1 truncate">{client.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{client.phone}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientCombobox;
