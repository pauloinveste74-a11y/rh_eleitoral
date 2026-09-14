import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangeFields({ from, to }: { from?: string; to?: string }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor="from">De</Label>
        <Input type="date" id="from" name="from" defaultValue={from} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to">Até</Label>
        <Input type="date" id="to" name="to" defaultValue={to} />
      </div>
    </>
  );
}
