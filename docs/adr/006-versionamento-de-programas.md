# ADR 006 — Versionamento imutável de programas

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

Programas são globais e administrados pela Spark. Alterar fases ou atividades enquanto pessoas executam um ciclo destruiria a reprodutibilidade do progresso, dos relatórios e da gamificação. Ao mesmo tempo, uma inscrição `AVAILABLE` ainda não iniciou uma experiência concreta.

## Decisão

`Program` representa a identidade estável do produto, com estado `ACTIVE` ou `ARCHIVED`; `ProgramVersion` representa uma definição executável. Fases e atividades pertencem à versão, nunca diretamente ao programa. Arquivar o programa impede novas habilitações e novos inícios, sem apagar versões ou execuções existentes.

Cada versão possui número inteiro crescente por programa e estado `DRAFT`, `PUBLISHED` ou `ARCHIVED`, com `UNIQUE (programId, versionNumber)`.

- `DRAFT` pode ser editada e não pode iniciar enrollments;
- publicar valida a definição completa e a torna imutável;
- `PUBLISHED` é a versão corrente para novos inícios;
- ao publicar uma sucessora, a versão corrente anterior passa a `ARCHIVED` na mesma transação;
- `ARCHIVED` continua legível e executável por enrollments já vinculados, mas não recebe novos ciclos;
- publicação e arquivamento não são revertidos; uma correção gera nova versão.

Cada programa pode possuir no máximo uma versão `DRAFT` e uma `PUBLISHED` por vez. O banco reforçará essas invariantes com índices parciais, além da validação do caso de uso.

`TenantProgram` habilita a identidade `Program`, não uma versão. Habilitação exige que o programa possua versão publicada.

Uma inscrição `AVAILABLE` permanece sem `programVersionId`. No início do ciclo, o caso de uso captura atomicamente a versão publicada corrente e torna `programVersionId` obrigatório e imutável. Assim, uma atualização anterior ao início oferece o conteúdo atual; uma atualização posterior não altera o ciclo em andamento.

Desabilitar `TenantProgram` impede novas inscrições e novos inícios, mas não interrompe enrollments `ACTIVE` ou `PAUSED`. Suspensão de tenant segue sua própria regra administrativa.

## Publicação

A publicação é um caso de uso de plataforma e exige:

- ao menos uma fase e uma atividade válida;
- ordenação única e determinística de fases e atividades dentro de seus pais;
- chaves funcionais de atividades únicas dentro da versão;
- duração e regras exigidas pelo tipo do programa;
- transação que publica a nova versão, arquiva a anterior e atualiza o ponteiro corrente;
- `AuditEvent` sem copiar conteúdo privado ou payload integral para metadata.

IDs de fases e atividades mudam entre versões. Relatórios agregam pela chave funcional estável quando precisam comparar versões, preservando os IDs concretos como fonte do fato.

## Consequências

- `Enrollment.programVersionId` será nulo somente enquanto `AVAILABLE` e obrigatório após o início;
- todo fato de execução resolve sua atividade dentro da versão fixada pelo enrollment;
- alterações de catálogo não reescrevem ciclos nem relatórios históricos;
- correções editoriais após publicação também exigem nova versão no MVP;
- customização por tenant continua fora do escopo.
