# Adaptação do Projeto 66 para 77 dias

O nome apresentado passa a Projeto 77 / Protocolo 77. Cores, CSS, layout,
atividades, pontuação, privacidade, rotas e chaves internas foram preservados.
O slug continua `projeto-66` para manter os vínculos e links existentes.

## Calendário

- Quebra do Programa: dias 1–22 (22 dias).
- Construção do Novo Eu: dias 23–44 (22 dias).
- Consolidação da Identidade: dias 45–77 (33 dias).
- Alta Performance: dias 59–76; ritual de encerramento no dia 77.

O servidor continua calculando calendário e pausas pela duração da versão.
Percentuais, sequências, fases, textos e mapa de calor usam essa mesma duração
no frontend. Ciclos já iniciados permanecem vinculados à versão de 66 dias;
os próximos inícios usam a versão publicada de 77 dias.

## Ativação

Após disponibilizar o código atualizado, executar com o ambiente do backend
configurado e `PLATFORM_ACCESS_ID` de um administrador ativo:

```bash
npm run programs:materialize:projeto66 --workspace backend
```

O comando existente cria o catálogo de 77 dias em instalações novas. Quando
encontra a definição original de 66 dias, cria e publica uma versão sucessora
e atualiza o nome do programa. Não altera inscrições, registros ou atividades
da versão antiga. Não requer migração de schema.

A transição aceita apenas a identidade e definição anteriores exatas. Catálogo
ou draft customizado gera conflito em vez de ser sobrescrito. Uma nova execução
retoma um draft compatível ou conclui a atualização de identidade interrompida;
após concluída, retorna `UNCHANGED`.

## Reversão

Antes da publicação, basta retirar a alteração do catálogo. Depois da publicação,
usar a administração existente para criar e publicar outra versão com a definição
anterior de 66 dias, mantendo o frontend compatível com ambas as durações.
Não apagar nem modificar versões publicadas: ciclos que já iniciaram em 77 dias
continuam vinculados à sua versão. Suspender a materialização automática de 77
durante uma reversão para não republicar a transição.

## Validação

Os testes cobrem limites de calendário nos dias 66, 67, 76, 77 e 78, progresso
completo de ambas as durações, limites das fases, mapa acessível, encerramento
da jornada, publicação idempotente, retomada e rejeição de versões customizadas.
O teste de integração compara as atividades antigas antes/depois da publicação.
