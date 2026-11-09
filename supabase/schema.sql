-- =====================================================================
-- ORAL SCAN – banco de dados (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do projeto Supabase da clínica.
-- Fuso de referência: America/Sao_Paulo (sem horário de verão).
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- PERFIS (dentistas e administradores)
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null default 'dentista' check (papel in ('dentista','admin')),
  nome text not null default '',
  cro text default '',
  cro_uf text default '',
  cpf_cnpj text default '',
  clinica text default '',
  telefone text default '',
  whatsapp text default '',
  email text default '',
  endereco text default '',
  bairro text default '',
  cidade text default '',
  cep text default '',
  ativo boolean not null default true,
  consentimento_lgpd timestamptz,
  criado_em timestamptz not null default now()
);

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfis where id = auth.uid() and papel = 'admin' and ativo);
$$;

-- e-mails que viram administradores automaticamente ao se cadastrar
-- (adicione com: insert into public.admins_convidados values ('email@exemplo.com');)
create table if not exists public.admins_convidados (email text primary key);
alter table public.admins_convidados enable row level security;

-- cria o perfil automaticamente quando alguém se cadastra
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into perfis (id, nome, cro, cro_uf, cpf_cnpj, clinica, telefone, whatsapp, email,
                      endereco, bairro, cidade, cep, consentimento_lgpd, papel)
  values (new.id, coalesce(m->>'nome',''), coalesce(m->>'cro',''), coalesce(m->>'cro_uf',''),
          coalesce(m->>'cpf_cnpj',''), coalesce(m->>'clinica',''), coalesce(m->>'telefone',''),
          coalesce(m->>'whatsapp',''), new.email, coalesce(m->>'endereco',''),
          coalesce(m->>'bairro',''), coalesce(m->>'cidade',''), coalesce(m->>'cep',''),
          case when (m->>'consentimento') = 'true' then now() end,
          case when exists (select 1 from admins_convidados where lower(email) = lower(new.email)) then 'admin' else 'dentista' end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

-- dentista não pode se promover a admin nem se reativar
create or replace function public.protege_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor / sistema: liberado
  if auth.uid() is not null and not eh_admin() then
    new.papel := old.papel;
    new.ativo := old.ativo;
  end if;
  return new;
end $$;
drop trigger if exists protege_perfil on public.perfis;
create trigger protege_perfil before update on public.perfis
  for each row execute function public.protege_perfil();

-- ---------------------------------------------------------------------
-- CONFIGURAÇÃO GERAL (linha única)
-- ---------------------------------------------------------------------
create table if not exists public.config (
  id int primary key default 1 check (id = 1),
  antecedencia_horas int not null default 48,        -- antecedência mínima p/ agendar
  passo_min int not null default 30,                 -- de quanto em quanto tempo mostrar horários
  intervalo_min int not null default 15,             -- intervalo após atendimento na sede
  intervalo_externo_min int not null default 60,     -- intervalo mínimo após atendimento externo
  cancelamento_horas int not null default 24,        -- cancelando com essa antecedência o crédito volta
  horarios jsonb not null default '{
    "0": [],
    "1": [{"ini":"08:00","fim":"12:00"},{"ini":"13:30","fim":"18:00"}],
    "2": [{"ini":"08:00","fim":"12:00"},{"ini":"13:30","fim":"18:00"}],
    "3": [{"ini":"08:00","fim":"12:00"},{"ini":"13:30","fim":"18:00"}],
    "4": [{"ini":"08:00","fim":"12:00"},{"ini":"13:30","fim":"18:00"}],
    "5": [{"ini":"08:00","fim":"12:00"},{"ini":"13:30","fim":"18:00"}],
    "6": []
  }'::jsonb,
  endereco_sede text not null default '',
  whatsapp_clinica text not null default '',
  chave_pix text not null default '',               -- usada só se o Mercado Pago não estiver configurado
  politica_privacidade text not null default ''
);
insert into public.config (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- SERVIÇOS (categorias de escaneamento)
-- ---------------------------------------------------------------------
create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  duracao_min int not null default 30 check (duracao_min > 0),
  ativo boolean not null default true,
  ordem int not null default 0
);
insert into public.servicos (nome, descricao, duracao_min, ordem)
select * from (values
  ('Prótese', 'Coroas, onlays, overlays, próteses fixas', 30, 1),
  ('Ortodontia', 'Escaneamento para documentação e planejamento ortodôntico', 30, 2),
  ('Estética', 'Facetas e reabilitação oral', 40, 3),
  ('Implantodontia', 'Escaneamento para planejamento e próteses sobre implantes', 40, 4),
  ('Modelos e planejamento digital', 'Modelos digitais e outros planejamentos', 30, 5)
) v(nome, descricao, duracao_min, ordem)
where not exists (select 1 from public.servicos);

-- ---------------------------------------------------------------------
-- REGIÕES ATENDIDAS NO ATENDIMENTO EXTERNO
-- ---------------------------------------------------------------------
create table if not exists public.regioes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  deslocamento_min int not null default 30 check (deslocamento_min >= 0),
  ativo boolean not null default true
);

-- ---------------------------------------------------------------------
-- BLOQUEIOS DE AGENDA
-- ---------------------------------------------------------------------
create table if not exists public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text not null default '',
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);

-- ---------------------------------------------------------------------
-- COMBOS, COMPRAS E CRÉDITOS
-- ---------------------------------------------------------------------
create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  qtd_creditos int not null check (qtd_creditos > 0),
  preco numeric(10,2) not null check (preco >= 0),
  preco_promocional numeric(10,2),
  promocao_ate date,
  validade_dias int not null default 180 check (validade_dias > 0),
  condicoes text default '',
  modalidade text not null default 'ambos' check (modalidade in ('sede','externo','ambos')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  dentista_id uuid not null references public.perfis(id),
  combo_id uuid not null references public.combos(id),
  combo_nome text not null,
  qtd_creditos int not null,
  modalidade text not null,
  validade_dias int not null,
  valor numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado','estornado')),
  gateway text not null default 'manual',      -- 'mercadopago' ou 'manual'
  transacao_id text unique,                     -- id do pagamento no intermediador
  pix_copia_cola text,
  pix_qr_base64 text,
  pago_em timestamptz,
  nf_path text,                                 -- nota fiscal anexada pelo admin (Storage "notas")
  criado_em timestamptz not null default now()
);

create table if not exists public.creditos (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id),
  dentista_id uuid not null references public.perfis(id),
  modalidade text not null,
  validade date not null,
  status text not null default 'disponivel' check (status in ('disponivel','usado','estornado')),
  agendamento_id uuid,
  criado_em timestamptz not null default now()
);
create index if not exists creditos_dentista on public.creditos(dentista_id, status, validade);

-- ---------------------------------------------------------------------
-- AGENDAMENTOS
-- "ocupa" = período em que o scanner/executor fica indisponível
-- (inclui deslocamento e intervalos). A restrição de exclusão impede
-- qualquer sobreposição, mesmo com dois dentistas clicando juntos.
-- ---------------------------------------------------------------------
create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  dentista_id uuid not null references public.perfis(id),
  servico_id uuid not null references public.servicos(id),
  servico_nome text not null,
  modalidade text not null check (modalidade in ('sede','externo')),
  inicio timestamptz not null,
  fim timestamptz not null,
  ocupa tstzrange not null,
  endereco text default '',
  regiao_id uuid references public.regioes(id),
  paciente_nome text not null,
  paciente_telefone text default '',
  dentes_regiao text default '',
  observacoes text default '',
  status text not null default 'agendado' check (status in ('agendado','concluido','cancelado','falta')),
  credito_id uuid references public.creditos(id),
  alteracao_solicitada text,
  motivo_cancelamento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint sem_sobreposicao exclude using gist (ocupa with &&)
    where (status in ('agendado','concluido'))
);
create index if not exists agendamentos_inicio on public.agendamentos(inicio);

-- ---------------------------------------------------------------------
-- AUDITORIA (registro de alterações)
-- ---------------------------------------------------------------------
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  acao text not null,
  usuario uuid,
  antes jsonb,
  depois jsonb,
  em timestamptz not null default now()
);

create or replace function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (tabela, registro_id, acao, usuario, antes, depois)
  values (tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
          tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$ declare t text;
begin
  foreach t in array array['combos','compras','agendamentos','bloqueios','config','servicos','regioes','perfis'] loop
    execute format('drop trigger if exists auditoria on public.%I', t);
    execute format('create trigger auditoria after insert or update or delete on public.%I for each row execute function public.auditar()', t);
  end loop;
end $$;

-- =====================================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================================

-- Ocupação da agenda (sem dados pessoais) – usada para calcular horários livres
create or replace function public.ocupacao(de timestamptz, ate timestamptz)
returns table (ini timestamptz, fim timestamptz, tipo text)
language sql stable security definer set search_path = public as $$
  select lower(ocupa), upper(ocupa), 'agendamento' from agendamentos
   where status in ('agendado','concluido') and ocupa && tstzrange(de, ate)
  union all
  select inicio, fim, 'bloqueio' from bloqueios
   where tstzrange(inicio, fim) && tstzrange(de, ate);
$$;

-- Libera o combo SOMENTE depois de pago. Idempotente: chamar duas vezes não duplica créditos.
create or replace function public.liberar_compra(p_compra uuid, p_transacao text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c compras%rowtype;
begin
  if auth.uid() is not null and not eh_admin() then
    raise exception 'Apenas o administrador ou o intermediador de pagamento podem liberar compras.';
  end if;
  select * into c from compras where id = p_compra for update;
  if not found then raise exception 'Compra não encontrada'; end if;
  if c.status = 'pago' then return; end if;
  if c.status <> 'pendente' then raise exception 'Compra está %', c.status; end if;
  update compras set status = 'pago', pago_em = now(),
         transacao_id = coalesce(p_transacao, transacao_id) where id = p_compra;
  insert into creditos (compra_id, dentista_id, modalidade, validade)
  select c.id, c.dentista_id, c.modalidade, (now() at time zone 'America/Sao_Paulo')::date + c.validade_dias
    from generate_series(1, c.qtd_creditos);
end $$;

-- Estorno: devolve o dinheiro (fora do sistema) e cancela os créditos ainda não usados
create or replace function public.estornar_compra(p_compra uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'Apenas administradores.'; end if;
  update compras set status = 'estornado' where id = p_compra and status = 'pago';
  update creditos set status = 'estornado' where compra_id = p_compra and status = 'disponivel';
end $$;

-- Cria a compra (pendente) para o dentista logado
create or replace function public.criar_compra(p_combo uuid)
returns compras language plpgsql security definer set search_path = public as $$
declare cb combos%rowtype; v numeric; r compras%rowtype;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into cb from combos where id = p_combo and ativo;
  if not found then raise exception 'Combo indisponível.'; end if;
  v := case when cb.preco_promocional is not null
             and (cb.promocao_ate is null or cb.promocao_ate >= (now() at time zone 'America/Sao_Paulo')::date)
            then cb.preco_promocional else cb.preco end;
  insert into compras (dentista_id, combo_id, combo_nome, qtd_creditos, modalidade, validade_dias, valor)
  values (auth.uid(), cb.id, cb.nome, cb.qtd_creditos, cb.modalidade, cb.validade_dias, v)
  returning * into r;
  return r;
end $$;

-- AGENDAR: valida tudo no servidor e consome 1 crédito
create or replace function public.agendar(
  p_servico uuid, p_modalidade text, p_inicio timestamptz,
  p_paciente_nome text, p_paciente_telefone text, p_dentes text, p_obs text,
  p_endereco text default '', p_regiao uuid default null, p_dentista uuid default null
) returns agendamentos language plpgsql security definer set search_path = public as $$
declare
  cfg config%rowtype; s servicos%rowtype; rg regioes%rowtype;
  dent uuid := coalesce(p_dentista, auth.uid());
  v_fim timestamptz; pre int := 0; pos int; local_ini timestamp; local_fim timestamp;
  dow text; janela jsonb; dentro boolean := false; cred uuid; r agendamentos%rowtype;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if p_dentista is not null and p_dentista <> auth.uid() and not eh_admin() then
    raise exception 'Sem permissão.';
  end if;
  if not exists (select 1 from perfis where id = dent and ativo) then
    raise exception 'Cadastro inativo. Fale com a clínica.';
  end if;
  select * into cfg from config where id = 1;
  select * into s from servicos where id = p_servico and ativo;
  if not found then raise exception 'Serviço indisponível.'; end if;
  if coalesce(trim(p_paciente_nome),'') = '' then raise exception 'Informe o nome do paciente.'; end if;

  v_fim := p_inicio + make_interval(mins => s.duracao_min);
  pos := cfg.intervalo_min;
  if p_modalidade = 'externo' then
    select * into rg from regioes where id = p_regiao and ativo;
    if not found then raise exception 'Região não atendida no atendimento externo.'; end if;
    if coalesce(trim(p_endereco),'') = '' then raise exception 'Informe o endereço do atendimento.'; end if;
    pre := rg.deslocamento_min;
    pos := greatest(rg.deslocamento_min, cfg.intervalo_externo_min);
  elsif p_modalidade <> 'sede' then
    raise exception 'Modalidade inválida.';
  end if;

  if not eh_admin() and p_inicio < now() + make_interval(hours => cfg.antecedencia_horas) then
    raise exception 'Agendamentos só com % horas de antecedência.', cfg.antecedencia_horas;
  end if;

  -- dentro do horário de funcionamento
  local_ini := p_inicio at time zone 'America/Sao_Paulo';
  local_fim := v_fim at time zone 'America/Sao_Paulo';
  dow := extract(dow from local_ini)::int::text;
  for janela in select * from jsonb_array_elements(coalesce(cfg.horarios->dow, '[]'::jsonb)) loop
    if local_ini::time >= (janela->>'ini')::time and local_fim::time <= (janela->>'fim')::time
       and local_ini::date = local_fim::date then
      dentro := true;
    end if;
  end loop;
  if not dentro then raise exception 'Horário fora do funcionamento.'; end if;

  if exists (select 1 from bloqueios
             where tstzrange(inicio, fim) && tstzrange(p_inicio - make_interval(mins => pre), v_fim)) then
    raise exception 'Horário bloqueado na agenda.';
  end if;

  -- crédito válido, compatível com a modalidade, o que vence primeiro
  select id into cred from creditos
   where dentista_id = dent and status = 'disponivel'
     and validade >= (now() at time zone 'America/Sao_Paulo')::date
     and modalidade in ('ambos', p_modalidade)
   order by validade, criado_em limit 1 for update skip locked;
  if cred is null then raise exception 'Você não tem créditos válidos para esta modalidade. Adquira um combo.'; end if;

  begin
    insert into agendamentos (dentista_id, servico_id, servico_nome, modalidade, inicio, fim, ocupa,
                              endereco, regiao_id, paciente_nome, paciente_telefone, dentes_regiao, observacoes, credito_id)
    values (dent, s.id, s.nome, p_modalidade, p_inicio, v_fim,
            tstzrange(p_inicio - make_interval(mins => pre), v_fim + make_interval(mins => pos)),
            case when p_modalidade = 'externo' then p_endereco else cfg.endereco_sede end,
            case when p_modalidade = 'externo' then p_regiao end,
            trim(p_paciente_nome), coalesce(p_paciente_telefone,''), coalesce(p_dentes,''), coalesce(p_obs,''), cred)
    returning * into r;
  exception when exclusion_violation then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.';
  end;
  update creditos set status = 'usado', agendamento_id = r.id where id = cred;
  return r;
end $$;

-- CANCELAR: devolve o crédito se dentro da regra (admin decide)
create or replace function public.cancelar_agendamento(p_id uuid, p_motivo text default '', p_devolver boolean default null)
returns text language plpgsql security definer set search_path = public as $$
declare a agendamentos%rowtype; cfg config%rowtype; devolve boolean;
begin
  select * into a from agendamentos where id = p_id for update;
  if not found then raise exception 'Agendamento não encontrado.'; end if;
  if a.dentista_id is distinct from auth.uid() and not eh_admin() then raise exception 'Sem permissão.'; end if;
  if a.status <> 'agendado' then raise exception 'Este agendamento já está %.', a.status; end if;
  select * into cfg from config where id = 1;
  if eh_admin() and p_devolver is not null then
    devolve := p_devolver;
  else
    devolve := a.inicio - now() >= make_interval(hours => cfg.cancelamento_horas);
  end if;
  update agendamentos set status = 'cancelado', motivo_cancelamento = p_motivo, atualizado_em = now() where id = p_id;
  if devolve and a.credito_id is not null then
    update creditos set status = 'disponivel', agendamento_id = null where id = a.credito_id;
    return 'Cancelado. O crédito voltou para o seu saldo.';
  end if;
  return 'Cancelado. Pela regra de cancelamento, o crédito não foi devolvido.';
end $$;

-- Admin: concluir / registrar falta
create or replace function public.mudar_status_agendamento(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'Apenas administradores.'; end if;
  if p_status not in ('agendado','concluido','falta') then raise exception 'Status inválido.'; end if;
  update agendamentos set status = p_status, atualizado_em = now() where id = p_id and status <> 'cancelado';
end $$;

-- Admin: remarcar (mantém crédito; recalcula ocupação)
create or replace function public.remarcar(p_id uuid, p_inicio timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare a agendamentos%rowtype; dur interval; pre interval; pos interval;
begin
  if not eh_admin() then raise exception 'Apenas administradores.'; end if;
  select * into a from agendamentos where id = p_id for update;
  dur := a.fim - a.inicio;
  pre := a.inicio - lower(a.ocupa);
  pos := upper(a.ocupa) - a.fim;
  begin
    update agendamentos set inicio = p_inicio, fim = p_inicio + dur,
      ocupa = tstzrange(p_inicio - pre, p_inicio + dur + pos), alteracao_solicitada = null, atualizado_em = now()
    where id = p_id;
  exception when exclusion_violation then
    raise exception 'Conflita com outro agendamento.';
  end;
end $$;

-- Dentista: pedir alteração de horário
create or replace function public.solicitar_alteracao(p_id uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update agendamentos set alteracao_solicitada = p_texto, atualizado_em = now()
   where id = p_id and dentista_id = auth.uid() and status = 'agendado';
  if not found then raise exception 'Agendamento não encontrado.'; end if;
end $$;

-- =====================================================================
-- SEGURANÇA (RLS) – cada dentista só vê os próprios dados
-- =====================================================================
alter table public.perfis enable row level security;
alter table public.config enable row level security;
alter table public.servicos enable row level security;
alter table public.regioes enable row level security;
alter table public.bloqueios enable row level security;
alter table public.combos enable row level security;
alter table public.compras enable row level security;
alter table public.creditos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.auditoria enable row level security;

drop policy if exists p_perfis_ler on public.perfis;
create policy p_perfis_ler on public.perfis for select using (id = auth.uid() or eh_admin());
drop policy if exists p_perfis_editar on public.perfis;
create policy p_perfis_editar on public.perfis for update using (id = auth.uid() or eh_admin());

drop policy if exists p_config_ler on public.config;
create policy p_config_ler on public.config for select using (auth.uid() is not null);
drop policy if exists p_config_admin on public.config;
create policy p_config_admin on public.config for update using (eh_admin());

do $$ declare t text;
begin
  foreach t in array array['servicos','regioes','combos'] loop
    execute format('drop policy if exists p_ler on public.%I', t);
    execute format('create policy p_ler on public.%I for select using (auth.uid() is not null)', t);
    execute format('drop policy if exists p_admin on public.%I', t);
    execute format('create policy p_admin on public.%I for all using (eh_admin()) with check (eh_admin())', t);
  end loop;
end $$;

drop policy if exists p_bloq_admin on public.bloqueios;
create policy p_bloq_admin on public.bloqueios for all using (eh_admin()) with check (eh_admin());

drop policy if exists p_compras_ler on public.compras;
create policy p_compras_ler on public.compras for select using (dentista_id = auth.uid() or eh_admin());
drop policy if exists p_compras_admin on public.compras;
create policy p_compras_admin on public.compras for update using (eh_admin());

drop policy if exists p_creditos_ler on public.creditos;
create policy p_creditos_ler on public.creditos for select using (dentista_id = auth.uid() or eh_admin());

drop policy if exists p_ag_ler on public.agendamentos;
create policy p_ag_ler on public.agendamentos for select using (dentista_id = auth.uid() or eh_admin());
drop policy if exists p_ag_admin on public.agendamentos;
create policy p_ag_admin on public.agendamentos for update using (eh_admin());

drop policy if exists p_aud_admin on public.auditoria;
create policy p_aud_admin on public.auditoria for select using (eh_admin());

-- funções: só usuários logados
revoke execute on function public.liberar_compra(uuid, text) from anon, public;
grant execute on function public.liberar_compra(uuid, text) to authenticated, service_role;
revoke execute on function public.agendar from anon, public;
grant execute on function public.agendar to authenticated;
revoke execute on function public.criar_compra(uuid) from anon, public;
grant execute on function public.criar_compra(uuid) to authenticated;
do $$ declare f text;
begin
  foreach f in array array['public.ocupacao(timestamptz,timestamptz)','public.estornar_compra(uuid)',
    'public.cancelar_agendamento(uuid,text,boolean)','public.mudar_status_agendamento(uuid,text)',
    'public.remarcar(uuid,timestamptz)','public.solicitar_alteracao(uuid,text)'] loop
    execute format('revoke execute on function %s from anon, public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- =====================================================================
-- STORAGE: notas fiscais (privado). Caminho: <dentista_id>/<compra_id>.pdf
-- =====================================================================
insert into storage.buckets (id, name, public) values ('notas', 'notas', false)
on conflict (id) do nothing;

drop policy if exists notas_ler on storage.objects;
create policy notas_ler on storage.objects for select
  using (bucket_id = 'notas' and (eh_admin() or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists notas_admin on storage.objects;
create policy notas_admin on storage.objects for all
  using (bucket_id = 'notas' and eh_admin()) with check (bucket_id = 'notas' and eh_admin());

-- =====================================================================
-- DEPOIS DE RODAR: cadastre-se no app com o e-mail da Dra. Tamires e
-- execute a linha abaixo trocando o e-mail, para virar administradora:
--   update public.perfis set papel = 'admin' where email = 'email@da-clinica.com';
-- =====================================================================

-- =====================================================================
-- INTEGRAÇÃO: vendas -> planilha Google (Apps Script em planilha/vendas-webhook.gs)
-- Depois de publicar o Apps Script, grave URL e token:
--   update public.integracoes set planilha_url = 'https://script.google.com/macros/s/.../exec',
--                                  planilha_token = 'MESMO_TOKEN_DO_SCRIPT' where id = 1;
-- =====================================================================
create extension if not exists pg_net with schema extensions;

create table if not exists public.integracoes (
  id int primary key default 1 check (id = 1),
  planilha_url text,
  planilha_token text
);
alter table public.integracoes enable row level security; -- sem políticas: só o banco lê
insert into public.integracoes (id) values (1) on conflict do nothing;

create or replace function public.enviar_venda_planilha() returns trigger
language plpgsql security definer set search_path = public, extensions as $fn$
declare i integracoes%rowtype; p perfis%rowtype;
begin
  select * into i from integracoes where id = 1;
  if i.planilha_url is null or i.planilha_url = '' then return new; end if;
  select * into p from perfis where id = new.dentista_id;
  perform net.http_post(
    url := i.planilha_url,
    body := jsonb_build_object(
      'token', i.planilha_token, 'compra_id', new.id, 'criado_em', new.criado_em, 'pago_em', new.pago_em,
      'status', new.status, 'nome', p.nome, 'email', p.email, 'whatsapp', p.whatsapp, 'cro', p.cro || '/' || p.cro_uf,
      'clinica', p.clinica, 'cpf_cnpj', p.cpf_cnpj, 'combo', new.combo_nome, 'creditos', new.qtd_creditos,
      'valor', new.valor, 'transacao_id', new.transacao_id, 'gateway', new.gateway),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  return new; -- nunca bloquear a venda por falha na planilha
end $fn$;

drop trigger if exists venda_para_planilha on public.compras;
create trigger venda_para_planilha after update of status on public.compras
  for each row when (new.status is distinct from old.status and new.status in ('pago','estornado','cancelado'))
  execute function public.enviar_venda_planilha();
