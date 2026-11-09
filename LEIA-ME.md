# Oral Scan – app de agendamento de escaneamento intraoral

App web instalável (PWA) para a clínica da **Dra. Tamires Bueno**. Funciona no celular (Android e iPhone, "Adicionar à tela inicial") e no computador. Custo fixo: **R$ 0**.

| Peça | Serviço | Custo |
|---|---|---|
| Site/app | GitHub Pages | grátis |
| Banco, login, arquivos (NF) | Supabase – plano Free | grátis (500 MB banco, 1 GB arquivos) |
| PIX automático | Mercado Pago | só a taxa por PIX recebido (~0,99%) |
| WhatsApp | links prontos (wa.me) | grátis |
| Domínio próprio (opcional) | Registro.br `oralscan.com.br` | ~R$ 40/ano |

## O que o app faz

**Dentista**: cadastro (nome, CRO/UF, CPF/CNPJ, clínica, telefone, WhatsApp, e-mail, endereço) com aceite LGPD · compra de combos com PIX · saldo de créditos e validade · agendamento em 5 passos (tipo → local → dia/horário livre → paciente → confirmação) · consulta de agendamentos futuros/anteriores · cancelar (crédito volta se dentro do prazo) ou pedir alteração · baixar NF · confirmação pelo WhatsApp.

**Administradora**: painel (faturamento do mês, vendas, combos mais vendidos, agendados, créditos, pendentes, horários livres e bloqueados) · agenda dia/semana/mês · agendamentos com filtros e exportação Excel/PDF · concluir, falta, remarcar, cancelar (devolvendo ou não o crédito) · mensagens prontas de WhatsApp (confirmação, lembrete, alteração, cancelamento) · bloqueios (horário, dia, vários dias) com alerta de agendamentos afetados · dentistas (cadastrar, editar, desativar, tornar admin) · combos e preços (promoção, desconto, validade, modalidade, histórico de alterações) · vendas (filtros dia/semana/mês/ano/personalizado/combo/cliente, ticket médio, estornos, anexar NF, confirmar PIX manual, Excel/PDF) · créditos rastreáveis (compra de origem → agendamento) · configurações (antecedência, intervalos, horário de funcionamento, serviços e durações, regiões externas e deslocamento, regra de cancelamento) · histórico de tudo que foi alterado.

## Regras de agenda (garantidas no banco, não só na tela)

- Só mostra horários realmente livres; dois dentistas clicando juntos não conseguem o mesmo horário (restrição de exclusão no Postgres).
- Considera a duração de cada serviço e o intervalo após cada atendimento.
- **Externo**: reserva o deslocamento antes e `max(deslocamento, 1 h)` depois; só para regiões cadastradas.
- Bloqueios e horário de funcionamento sempre respeitados.
- Antecedência mínima configurável (padrão **48 h**; o documento fala em 72 h no item 5 e 48 h no item 14 — ajuste em Configurações).
- Só agenda quem tem crédito válido (não vencido, compatível com a modalidade do combo). 1 agendamento = 1 crédito.
- Combo só é liberado quando o pagamento é confirmado (webhook do Mercado Pago consulta o pagamento na API; liberação idempotente, sem duplicar créditos).

## Testar agora (modo demonstração)

Sem Supabase configurado, o app abre em **modo demonstração** (dados só no navegador):
- Admin: `admin@demo.com` / `demo123`
- Dentista: `dentista@demo.com` / `demo123`

```bash
npm install
npm run dev
```

Também dá para forçar o demo em produção adicionando `?demo` na URL.

## Colocar em produção (passo a passo)

### 1. Supabase (banco gratuito, conta da clínica)
1. Criar conta em https://supabase.com com o e-mail da clínica → **New project** → região **South America (São Paulo)**.
2. **SQL Editor** → colar todo o arquivo `supabase/schema.sql` → **Run**.
3. **Authentication → URL Configuration**: Site URL = endereço do app (ex.: `https://USUARIO.github.io/oral-scan/`).
4. **Project Settings → API**: copiar *Project URL* e a *publishable/anon key*.
5. A Dra. Tamires se cadastra no app e depois roda no SQL Editor:
   `update public.perfis set papel = 'admin' where email = 'EMAIL-DELA';`

### 2. Publicar o site (GitHub Pages)
1. Criar o repositório `oral-scan` e enviar esta pasta.
2. **Settings → Pages → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables**: criar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Cada `git push` publica sozinho (`.github/workflows/deploy.yml`).

### 3. PIX automático (Mercado Pago) – opcional, mas recomendado
1. Conta Mercado Pago da clínica → **Suas integrações → Criar aplicação** → copiar o *Access Token de produção*.
2. Supabase → **Edge Functions**: publicar `pix-criar` e `pix-webhook` (pasta `supabase/functions`). O `pix-webhook` deve ficar com **Verify JWT desligado**.
3. **Edge Functions → Secrets**: `MP_ACCESS_TOKEN` = token do passo 1.

Sem o Mercado Pago, o app gera um PIX com a **chave PIX** cadastrada em Configurações e a administradora confirma o pagamento em **Vendas → Confirmar pgto.** (os créditos só liberam nesse clique).

## LGPD e segurança
- Login individual; cada dentista só enxerga os próprios dados (Row Level Security).
- Perfis dentista/admin; dentista não consegue se promover.
- Notas fiscais em armazenamento privado (link temporário de 2 min).
- Histórico de alterações automático (tabela `auditoria`).
- Backup: o plano Free do Supabase não tem backup automático restaurável — exporte o banco periodicamente (**Database → Backups** ou `pg_dump`) ou suba para o plano Pro quando houver volume.
- Política de privacidade padrão em `/privacidade`, editável em Configurações. Aceite registrado no cadastro.

## WhatsApp
Hoje: botões que abrem o WhatsApp com a mensagem pronta (grátis). Envio **100% automático** (sem clicar) exige API paga — WhatsApp Cloud API da Meta (cobrança por conversa) ou serviços como Z-API. O ponto de integração é o mesmo das funções do Supabase.

## Segunda etapa (do documento, ainda não feito)
Upload de STL/PLY por paciente, histórico de arquivos, pagamento com cartão, relatórios de produtividade e integração com laboratórios.

## Estrutura
```
src/lib/agenda.js        cálculo dos horários livres
src/lib/api-supabase.js  dados reais
src/lib/api-demo.js      modo demonstração (mesmas regras)
src/pages/dentista/*     telas do dentista
src/pages/admin/*        painel administrativo
supabase/schema.sql      banco, regras e segurança
supabase/functions/*     PIX Mercado Pago (gerar + webhook)
```
