import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AxisForm } from "@/components/configuracoes/axis-form";
import { CityForm } from "@/components/configuracoes/city-form";
import { TeamForm } from "@/components/configuracoes/team-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const [{ data: isAdmin }, { data: axes }, { data: cities }, { data: teams }] =
    await Promise.all([
      supabase.rpc("is_admin"),
      supabase.from("axes").select("id, name, code").order("name"),
      supabase
        .from("cities")
        .select("id, name, state, is_administrative_region, axis_id")
        .order("name"),
      supabase.from("teams").select("id, name, city_id").order("name"),
    ]);

  const axesList = axes ?? [];
  const citiesList = cities ?? [];
  const teamsList = teams ?? [];
  const axisNameById = new Map(axesList.map((a) => [a.id, a.name]));
  const cityNameById = new Map(citiesList.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Estrutura territorial da campanha: eixos, cidades e equipes."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eixos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isAdmin && <AxisForm />}
            {axesList.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum eixo cadastrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {axesList.map((axis) => (
                    <TableRow key={axis.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {axis.name}
                      </TableCell>
                      <TableCell>{axis.code}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cidades</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isAdmin && (
              <CityForm
                axes={axesList.map((a) => ({ id: a.id, name: a.name }))}
              />
            )}
            {citiesList.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhuma cidade cadastrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Eixo</TableHead>
                    <TableHead>Região Administrativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citiesList.map((city) => (
                    <TableRow key={city.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {city.name}
                      </TableCell>
                      <TableCell>{city.state}</TableCell>
                      <TableCell>{axisNameById.get(city.axis_id)}</TableCell>
                      <TableCell>
                        {city.is_administrative_region ? "Sim" : "Não"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isAdmin && (
              <TeamForm
                cities={citiesList.map((c) => ({ id: c.id, name: c.name }))}
              />
            )}
            {teamsList.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhuma equipe cadastrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamsList.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {team.name}
                      </TableCell>
                      <TableCell>{cityNameById.get(team.city_id)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
