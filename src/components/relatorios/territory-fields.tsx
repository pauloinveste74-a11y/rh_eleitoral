import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function TerritoryFields({
  axes,
  cities,
  teams,
  axisId,
  cityId,
  teamId,
}: {
  axes: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  axisId?: string;
  cityId?: string;
  teamId?: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor="axisId">Eixo</Label>
        <Select id="axisId" name="axisId" defaultValue={axisId ?? ""}>
          <option value="">Todos</option>
          {axes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="cityId">Cidade</Label>
        <Select id="cityId" name="cityId" defaultValue={cityId ?? ""}>
          <option value="">Todas</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="teamId">Equipe</Label>
        <Select id="teamId" name="teamId" defaultValue={teamId ?? ""}>
          <option value="">Todas</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
    </>
  );
}
