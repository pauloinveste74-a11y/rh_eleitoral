-- =============================================================================
-- Importação aceita mais formatos de planilha (usuário reportou "não aceita
-- subir excel")
-- =============================================================================
-- Causa raiz real: o bucket `pessoas-importacoes` (migração 0017) só permitia
-- o MIME moderno do .xlsx (`application/vnd.openxmlformats-officedocument.
-- spreadsheetml.sheet`). O Storage do Supabase aplica esse filtro por conta
-- própria, antes de qualquer validação da aplicação — então mesmo um .xlsx
-- genuíno era rejeitado sempre que o navegador/SO reportava um MIME
-- diferente (comum no Windows, dependendo da associação de arquivo), e um
-- .xls/.xlsm legítimo era sempre rejeitado (MIME diferente de propósito).
-- A biblioteca `xlsx` (SheetJS) já lê .xls/.xlsm nativamente — o código da
-- aplicação (uploadImportBatch()) também passou a aceitar essas extensões;
-- faltava só isto aqui, o bucket em si.
-- =============================================================================

update storage.buckets
set allowed_mime_types = array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- .xlsx
  'application/vnd.ms-excel', -- .xls
  'application/vnd.ms-excel.sheet.macroEnabled.12', -- .xlsm
  'application/octet-stream' -- alguns navegadores/SO não identificam o MIME certo
]
where id = 'pessoas-importacoes';
