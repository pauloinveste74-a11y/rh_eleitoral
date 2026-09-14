-- =============================================================================
-- Dados fictícios de desenvolvimento — NUNCA executar em produção
-- =============================================================================
-- Todos os nomes, CPFs, telefones e e-mails abaixo são fictícios, criados
-- apenas para permitir testar a navegação e o painel localmente. Nenhum CPF
-- aqui corresponde a uma pessoa real.
--
-- Este arquivo não cria usuários de autenticação (auth.users): crie o
-- primeiro usuário administrador pelo Supabase Studio (Authentication >
-- Add user) e depois associe o papel de administrador a ele — veja o
-- README, seção "Configurar o Supabase".
-- =============================================================================

insert into public.campaigns (id, name, slug, status) values
  ('00000000-0000-0000-0000-000000000001', 'Campanha Modelo 2026', 'campanha-modelo-2026', 'ativa');

insert into public.axes (id, campaign_id, name, code, status) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Eixo Norte', 'NORTE', 'ativo'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Eixo Sul', 'SUL', 'ativo');

insert into public.cities (id, axis_id, name, state, is_administrative_region, status) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Plano Piloto', 'DF', true, 'ativo'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Ceilândia', 'DF', true, 'ativo'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000102', 'Gama', 'DF', true, 'ativo');

insert into public.teams (id, city_id, name, status) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'Equipe Alfa', 'ativo'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'Equipe Bravo', 'ativo'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000203', 'Equipe Charlie', 'ativo');

insert into public.people (id, full_name, cpf, birth_date, phone, whatsapp, email, status) values
  ('00000000-0000-0000-0000-000000000401', 'Fulano de Tal Silva', '11111111111', '1990-05-12', '(61) 99999-0001', '(61) 99999-0001', 'fulano.silva@exemplo.dev', 'ativo'),
  ('00000000-0000-0000-0000-000000000402', 'Ciclana Souza Pereira', '22222222222', '1988-11-03', '(61) 99999-0002', '(61) 99999-0002', 'ciclana.pereira@exemplo.dev', 'ativo'),
  ('00000000-0000-0000-0000-000000000403', 'Beltrano Costa Lima', '33333333333', '1995-02-20', '(61) 99999-0003', '(61) 99999-0003', 'beltrano.lima@exemplo.dev', 'pendente_validacao_cidade'),
  ('00000000-0000-0000-0000-000000000404', 'Sicrana Oliveira Rocha', '44444444444', '1992-07-08', '(61) 99999-0004', '(61) 99999-0004', 'sicrana.rocha@exemplo.dev', 'documentos_pendentes');

insert into public.organizational_assignments
  (person_id, campaign_id, axis_id, city_id, team_id, role_id, valid_from, status)
select
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000301',
  r.id,
  '2026-01-15',
  'vigente'
from public.roles r where r.code = 'coordenador_equipe';

insert into public.organizational_assignments
  (person_id, campaign_id, axis_id, city_id, team_id, role_id, valid_from, status)
select
  '00000000-0000-0000-0000-000000000402',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000302',
  r.id,
  '2026-02-01',
  'vigente'
from public.roles r where r.code = 'colaborador';
