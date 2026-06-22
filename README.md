# Gerador de Sites — Micro-SaaS Multi-Tenant

Plataforma para criar sites de negócios locais a partir de links do Google Maps, com dashboard de edição para clientes.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Postgres + RLS, Auth, Storage)
- **Google Places API** (extração de dados)
- **OpenAI** (geração de conteúdo estruturado via Zod)
- **Vercel** (deploy + multi-tenant por subdomínio)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as chaves do Supabase, Google Places e (opcionalmente) OpenAI.

### 3. Aplicar migrations no Supabase

```bash
# Via Supabase CLI
supabase db push

# Ou execute manualmente o SQL em:
# supabase/migrations/20250612130000_initial_schema.sql
```

### 4. Criar usuário admin

Após criar sua conta via Magic Link, promova para admin no SQL Editor do Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

### 5. Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000` para o painel admin.

Sites de clientes ficam em `http://{slug}.localhost:3000`.

## Estrutura

```
src/
├── app/
│   ├── admin/          # Painel do desenvolvedor
│   ├── dashboard/      # Dashboard do cliente
│   ├── sites/[slug]/   # Sites públicos (ISR)
│   └── api/            # API routes
├── components/
│   ├── admin/          # Criador de sites, listagem
│   ├── dashboard/      # Editor de conteúdo, upload
│   └── ui/             # Componentes base
├── lib/
│   ├── ai/             # Geração de conteúdo com IA
│   ├── schemas/        # Schemas Zod por template
│   ├── services/       # Lógica de negócio
│   └── supabase/       # Clients Supabase
├── templates/
│   ├── universal/      # Template genérico
│   └── restaurant/     # Template restaurante
└── middleware.ts       # Multi-tenant routing
```

## Fluxo de criação

1. Admin cola link do Google Maps + escolhe template
2. Pipeline extrai dados via Places API
3. IA gera conteúdo + SEO (validado por Zod)
4. Site provisionado no banco com RLS
5. Magic Link gerado para onboarding do cliente

Se a extração falhar, um formulário manual permite criar o site mesmo assim.

## Fases futuras

- **Fase 3**: Stripe (billing + inadimplência)
- **Fase 4**: Domínios customizados (Vercel Domains API)
- **Fase 5**: Monitoramento + limpeza de churn
