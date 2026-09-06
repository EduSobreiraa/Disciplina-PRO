# Runbook de release e recuperação — laboratório

> Escopo: laboratório do Disciplina PRO em 06/09/2026. Este documento não autoriza alteração em contas corporativas, dados reais, segredos ou staging oficial.

## Regra de segurança

- Registrar somente commit, horário, ambiente, IDs técnicos e resultado; nunca copiar senhas, tokens, hashes, URLs de heartbeat, conexão PostgreSQL ou conteúdo de e-mail.
- Toda migration é **expandir → publicar → verificar**. Não usar `DROP`, `prisma migrate reset` ou restore como rollback normal.
- Um restore só pode apontar para banco descartável de `drill` ou `staging`; produção é recusada pelo script.
- Uma mudança de secret ou ação que interrompa tráfego requer responsável operacional presente e plano de reversão aprovado antes de começar.

## Deploy e migration

1. Fixar o commit candidato e confirmar CI verde. Não publicar árvore de trabalho com alterações não versionadas.
2. Executar no candidato: `npm run prisma:validate`, lint, typecheck, testes focados da mudança, build e os gates de CI aplicáveis.
3. Confirmar backup verificado antes de migration. Publicar primeiro a API com `npm run prisma:migrate:deploy --workspace backend` como pre-deploy; só então atualizar worker e frontend.
4. Confirmar `npm run prisma:migrate:status --workspace backend` sem migrations pendentes, readiness da API e smoke público/autenticado sem escrita de negócio.
5. Registrar commit, deployment, horário, migration aplicada, resultado de readiness e smoke. Se algum gate falhar, interromper antes de promover o próximo serviço.

### Falha de deploy ou migration

- Sem migration aplicada: voltar somente o binário para o último commit conhecido como bom e repetir readiness/smoke.
- Com migration aditiva e compatível: o binário anterior pode voltar; preservar as tabelas/colunas novas.
- Com incompatibilidade, dados parcialmente escritos ou migration destrutiva: não voltar o banco. Pausar a promoção, preservar logs sanitizados e aplicar **forward-fix** compatível.
- Restore de banco é último recurso para corrupção/perda de dados e exige o procedimento abaixo; não é ferramenta de rollback rotineiro.

## Backup e restore

O backup lógico diário no R2 é verificado por dump, manifesto SHA-256, `head-object` e heartbeat. Ele não substitui PITR/RPO de uma hora.

Para drill, criar previamente um banco Railway descartável e usar somente sua URL:

```sh
export RESTORE_TARGET_ENVIRONMENT=drill
export RESTORE_CONFIRM=RESTORE_DISCARDABLE_DATABASE
export RESTORE_DATABASE_URL='postgresql://.../disciplina_pro_restore'
export RESTORE_EXPECTED_DATABASE_NAME=disciplina_pro_restore
export R2_BACKUP_KEY='disciplina-pro/postgres/<arquivo>.dump'
./ops/backup/restore-postgres-from-r2.sh
```

Depois: rodar `DATABASE_URL="$RESTORE_DATABASE_URL" npm run prisma:migrate:status --workspace backend`, checar readiness contra o ambiente restaurado e executar smokes de login, execução, gamificação e outbox. Registrar idade do backup e duração do restore para RPO/RTO. PITR, restore dentro do Railway e corte manual continuam requisitos da reprodução corporativa; não foram simulados neste laboratório.

## Rotação de secrets

1. Gerar material fora do repositório e cadastrar manualmente no gerenciador de secrets; nunca salvar a saída em arquivo, ticket ou chat.
2. Para JWT, adicionar a nova chave pública, publicar nova privada e trocar `JWT_ACTIVE_KID` de modo atômico. Confirmar readiness, login e um token anterior; manter a pública anterior por mais de 10 minutos antes de removê-la.
3. Antes de trocar `REFRESH_TOKEN_PEPPER`, revogar sessões e comunicar novo login. Antes de trocar `INVITATION_TOKEN_PEPPER`, revogar convites pendentes e reemitir somente os necessários.
4. Em comprometimento, retirar a chave afetada, revogar o material dependente e abrir incidente. Não reutilizar secrets entre ambientes.

O ensaio de laboratório prova geração RSA/peppers em memória e as validações fail-fast. Rotação de secret real fica para as contas corporativas, pois deve invalidar sessões/convites de forma deliberada.

## Falha de e-mail

- `429`/`503` elegíveis: o worker agenda uma única retentativa após 30 minutos. Não acionar reenvio manual no intervalo.
- Rejeição permanente, reclamação, supressão, resultado ambíguo ou segunda falha: preservar o registro em `REVIEW`; não tentar uma terceira vez. O worker envia aviso único ao CEO elegível.
- No laboratório, para conter envio novo, desabilitar `SMTP_DELIVERY_ENABLED` na API **e** no worker e fazer redeploy dos dois serviços. Não alterar destinatário autorizado, estados, hashes ou jobs manualmente.
- Para recuperar, reabilitar a configuração somente após identificar a causa, conferir webhook assinado/estado do job e executar um único teste autorizado. `SENT` não é confirmação de caixa de entrada.

Em staging/produção, a flag desabilitada é rejeitada pela validação de ambiente. O plano de contenção do provedor corporativo deve ser definido junto à conta/dominio corporativos; não improvisar remoção de chaves ou redirecionamento de destinatários durante um incidente.

## Ensaio registrado em 06/09/2026

| Fluxo | Prova | Resultado |
|---|---|---|
| Deploy/migration | `npm run prisma:validate`; banco local descartável `disciplina_pro_e2e` com `prisma migrate deploy` | schema válido; 14 migrations, nenhuma pendente |
| Rollback/restore | `npm run test:operations` | 3/3: dump+checksum+restore, ausência de heartbeat em falha de upload e recusa de alvo `production` |
| Secrets | specs `environment` e `security-material` | 25/25: RSA/peppers independentes e fail-fast de configuração insegura |
| Falha de e-mail | integrações de retry, webhook e avisos no banco descartável | 26/26: retry único, revisão, aviso, deduplicação e proteção de dados |
| Saúde publicada | readiness da API e CI do commit `3a9457c` | API pronta com banco disponível; CI concluído com sucesso |

Nenhum ensaio rotacionou secret real, publicou binário, reverteu deployment, enviou e-mail novo ou restaurou banco compartilhado. A prova de e-mail real já registrada em [Operação Resend](OPERACAO_EMAIL_RESEND.md) continua válida para o laboratório.

## Referências

- [Identity Access](OPERACAO_IDENTITY_ACCESS.md): configuração, JWT, peppers e migrations.
- [Outbox e recuperação](OPERACAO_OUTBOX_E_RECUPERACAO.md): backup R2, restore e forward-fix.
- [Operação Resend](OPERACAO_EMAIL_RESEND.md): webhook, retry, aviso e limites de entrega.
- [Reprodução corporativa](CHECKLIST_REPRODUCAO_CORPORATIVA.md): PITR, contas corporativas e gates futuros.
