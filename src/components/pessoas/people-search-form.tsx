import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Form GET simples — funciona sem JS; o Server Component já lê searchParams. */
export function PeopleSearchForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="get" className="flex gap-2">
      <Input
        type="search"
        name="q"
        placeholder="Buscar por nome ou CPF..."
        defaultValue={defaultValue}
        className="max-w-sm"
      />
      <Button type="submit" variant="outline">
        Buscar
      </Button>
    </form>
  );
}
