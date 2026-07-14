# Disciplina PRO

Plataforma B2B SaaS multi-tenant da **Spark Inteligência Corporativa** para acompanhamento comportamental e execução de programas de desenvolvimento.

O **Projeto 66** é o primeiro programa disponível dentro da plataforma. Ele possui domínio e identidade visual próprios, sem estar acoplado ao núcleo do Disciplina PRO.

## Estado do projeto

O projeto está na etapa de migração e modularização do frontend. Os protótipos HTML originais permanecem no repositório como referência visual e funcional.

Já estão disponíveis:

- shell mobile-first do Disciplina PRO;
- catálogo de programas;
- tracker mensal de comportamentos em “Minha evolução”;
- ritual diário com abertura, execução, fechamento, revisão semanal e timer 30/30;
- gamificação com ledger de XP, níveis, conquistas e histórico de transações;
- grade verde/vermelha e justificativas;
- Projeto 66 com ciclo, registro diário, checklist e tracker;
- meditação, respiração, Novo Eu, modo crise e dia difícil;
- separação local entre dados objetivos e conteúdo privado;
- repositories locais preparados para futura substituição pela API.

O backend NestJS ainda não foi iniciado.

## Arquitetura planejada

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL |
| Arquitetura | Monolito modular em camadas |
| Multi-tenancy | Banco compartilhado com isolamento por `tenantId` |

Documentos principais:

- [Arquitetura do produto](ARQUITETURA.md)
- [Inventário e plano de migração do frontend](docs/MIGRACAO_FRONTEND.md)
- [Auditoria do frontend](docs/AUDITORIA_FRONTEND.md)
- [Relatório técnico de progresso](docs/RELATORIO_PROGRESSO.md)
- [Checklist de prontidão do backend](docs/PRE_BACKEND_CHECKLIST.md)

## Estrutura atual

```text
.
├── ARQUITETURA.md
├── docs/
│   ├── AUDITORIA_FRONTEND.md
│   ├── MIGRACAO_FRONTEND.md
│   ├── PRE_BACKEND_CHECKLIST.md
│   └── RELATORIO_PROGRESSO.md
├── backend/                   # backend planejado
└── frontend/
    ├── disciplina-pro.html    # protótipo de referência
    ├── protocolo_66_ios (1).html
    └── src/
        ├── app/
        ├── modules/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── discipline-tracker/
        │   ├── profile/
        │   ├── programs/
        │   └── projeto66/
        └── shared/            # componentes compartilhados futuros
```

## Como executar o frontend

Requisitos:

- Node.js compatível com Vite 8;
- npm.

```bash
cd frontend
npm install
npm run dev
```

A aplicação será disponibilizada normalmente em:

```text
http://localhost:5173/app
```

Não abra `frontend/index.html` diretamente ou por Live Server. O frontend utiliza módulos processados pelo Vite.

## Comandos de qualidade

Dentro de `frontend/`:

```bash
npm run lint
npm test
npm run build
```

Antes de um commit funcional, os três comandos devem ser aprovados. Mudanças de interface também devem ser verificadas em viewport móvel com Playwright quando o ambiente estiver disponível.

## Rotas implementadas

Plataforma:

```text
/login
/app
/app/programas
/app/ritual
/app/missoes
/app/conquistas
/app/protocolo
/app/minha-evolucao
/app/perfil
```

Projeto 66:

```text
/app/programas/projeto66
/app/programas/projeto66/hoje
/app/programas/projeto66/registrar
/app/programas/projeto66/meditar
/app/programas/projeto66/novo-eu
/app/programas/projeto66/jornada
/app/programas/projeto66/progresso
```

## Princípios de implementação

- mobile-first;
- fidelidade às identidades visuais dos protótipos;
- componentes, regras e persistência separados;
- conteúdo privado fora de relatórios e auditoria;
- indicadores derivados de fatos persistidos;
- programas desacoplados do núcleo da plataforma;
- controllers futuros sem acesso direto ao Prisma;
- autorização sempre combinando role e escopo do recurso.

## Fluxo de versionamento

- trabalhar em mudanças pequenas e coerentes;
- atualizar a documentação junto das decisões arquiteturais;
- executar lint, testes e build;
- revisar `git diff` e evitar artefatos locais;
- usar mensagens de commit descritivas;
- enviar somente mudanças validadas para o repositório remoto.

## Próximas etapas

1. iniciar o backend modular NestJS;
2. implementar autenticação e fundação multi-tenant;
3. substituir repositories locais pela API real por domínio.

## Responsável

Produto da Spark Inteligência Corporativa, desenvolvido por Eduardo com apoio de IA como ferramenta de engenharia e documentação.
