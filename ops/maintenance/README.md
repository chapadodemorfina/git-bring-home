# Manutenção dos logs internos

Estes scripts são preparados para execução administrativa autorizada no banco correto. Não são migrations da aplicação, não criam RPCs e não executam automaticamente ao publicar o frontend.

## Execução pelo GitHub

O workflow `Internal database log maintenance` tem somente acionamento manual e começa no modo `inspect`. Ele usa o secret `SUPABASE_ACCESS_TOKEN` disponível neste repositório; secrets de outro repositório ou Environment não são herdados. O token precisa ter acesso administrativo legítimo ao projeto `moijoyqwapimforpijdc`. Publicar código não concede esse acesso.

O runner `run.py` usa somente a Management API desse projeto fixo, confere sua identidade e não aceita SQL arbitrário. No modo `apply`, exige o projeto exato e a revisão das dependências. A rotina automática é criada no `pg_cron` pelo SQL, não por um cron adicional do GitHub.

Os testes offline são executados com `python3 -m unittest discover -s ops/maintenance -p 'test_*.py'`. Eles verificam limites de autorização, alvo, ausência de repetição após resposta ambígua e confirmação dos jobs. Não substituem a inspeção e validação do banco real.

## Sequência operacional

1. Confirme o projeto e o acesso SQL administrativo, por conexão PostgreSQL ou Management API autorizada. A limpeza exige um papel com visibilidade de todos os proprietários de jobs (`BYPASSRLS` ou superusuário), sem conceder privilégios novos. Não coloque credenciais no código, na linha de comando ou nos logs. Uma chave `service_role` da Data API não substitui acesso SQL administrativo.
2. Execute `inspect_internal_logs.sql` com parada imediata em erro. Verifique tamanho real das duas tabelas, permissões, timezone do cron, execuções inacabadas e dependências. Compare com o tamanho total do banco; não presuma que esses logs sejam a causa da ocupação. Para revisar consumidores sem varrer os registros dos logs, execute primeiro `inspect_log_consumers.sql`: essa consulta lê somente catálogos e retorna nomes, atributos e fingerprints, nunca o corpo das funções.
3. Registre os tamanhos e os metadados dos jobs e revise consumidores externos das respostas HTTP. A inspeção não imprime comandos de cron, headers, corpos HTTP nem tokens. Correspondências no código de funções são uma heurística; SQL dinâmico e consumidores externos podem não aparecer.
4. Com a limpeza autorizada e sem contraindicações, execute `cleanup_internal_logs.sql` como uma única operação com parada imediata em erro, sem remover as guardas. Se uma execução falhar, finalize a transação com `ROLLBACK` antes de qualquer nova tentativa.
5. Reexecute a inspeção, compare tamanhos e confirme que os jobs existentes mantêm IDs, horários, estado e fingerprints dos comandos. Após a primeira execução agendada, confira seu resultado agregado no histórico do cron. O script não envia notificações para validar a aplicação.

A inspeção é um único `SELECT` fixo, sem alteração de dados ou configuração, e retorna um único objeto JSON. Use um cliente com timeout; o runner tem limite de 90 segundos. Timeout do cliente não comprova cancelamento no servidor. A limpeza tem limites SQL próprios e também devolve um JSON de verificação após o commit. Em caso de timeout, desconexão ou resposta ambígua durante a limpeza, não a repita automaticamente: consulte novamente o estado antes de decidir. A operação pode ter sido confirmada mesmo sem resposta ao cliente.

## Efeito e proteção

A limpeza imediata apaga **todo o histórico técnico** de `cron.job_run_details` e `net._http_response`, inclusive entradas recentes. Não limpa filas de notificações, dados de negócio, histórico de pagamentos, estoque, Storage ou requisições HTTP pendentes. Não muda a frequência das notificações nem comandos de jobs existentes. As sequências são preservadas; não há `CASCADE`.

O script cria `daily-cleanup-internal-logs`, quando ausente, para executar às `06:00` no timezone de `pg_cron`. Em UTC, corresponde a `03:00` em Brasília. Esse job remove execuções com status `succeeded`/`failed` concluídas há mais de três dias e respostas HTTP com mais de três dias. A rotina diária usa `DELETE`: o espaço pode ser reutilizado após vacuum, mas a redução física imediata não é garantida.

Se já existir um job com esse nome, apenas a definição idêntica, ativa, no banco e proprietário atuais é aceita. Divergência de comando, horário, proprietário ou estado aborta a operação; não há substituição silenciosa. Uma nova execução manual de limpeza continua apagando todo o histórico acumulado desde a anterior: use o job de retenção para a manutenção recorrente.

Locks têm limite de três segundos e a operação tem limite de sessenta segundos. FKs, triggers não internos, herança, tabelas/colunas inesperadas, consumidores em funções próprias ou views e registros de cron em andamento impedem a limpeza. Não contorne essas verificações. Um registro antigo inacabado precisa ser investigado; ele não deve ser apagado separadamente para fazer o script passar.

O `TRUNCATE` é reversível enquanto a transação permanece aberta. Depois do `COMMIT`, o histórico excluído só pode ser recuperado de backup prévio. Métricas externas de armazenamento podem demorar para refletir a liberação.

## Rotina administrativa reconhecida

A implementação oficial de `extensions.grant_pg_cron_access()` menciona `cron.job_run_details` para revogar o privilégio de criação de triggers. Ela administra permissões na criação da extensão e não consome os registros dos logs. A verificação textual de consumidores precisa distinguir essa implementação dos consumidores da aplicação.

A exceção reconhece somente a definição revisada no repositório `supabase/postgres`, commit [`8b0ef1ef942e18493bf5c89087eff7b030c0e26d`](https://github.com/supabase/postgres/tree/8b0ef1ef942e18493bf5c89087eff7b030c0e26d):

- [Corpo da função](https://github.com/supabase/postgres/blob/8b0ef1ef942e18493bf5c89087eff7b030c0e26d/migrations/db/migrations/20260730000000_revoke_trigger_on_cron_tables_from_postgres.sql).
- [Proprietário e associação ao evento](https://github.com/supabase/postgres/blob/8b0ef1ef942e18493bf5c89087eff7b030c0e26d/migrations/db/migrations/20231020085357_revoke_writes_on_cron_job_from_postgres.sql).

O script exige simultaneamente identidade exata, ausência de argumentos, retorno `event_trigger`, linguagem `plpgsql`, proprietário `supabase_admin`, atributos de execução originais e um único event trigger: `issue_pg_cron_access`, do mesmo proprietário, habilitado normalmente, em `ddl_command_end`, restrito a `CREATE EXTENSION`. Exige também o SHA-256 `ccca00e6a47ee295704efda0585689cbb1802071c64adfd62b39879cf1f383a2` do corpo completo, normalizando apenas CRLF para LF e espaços/tabulações/quebras nas extremidades. Não remove comentários nem normaliza o interior do código.

Uma divergência ou valor desconhecido mantém o bloqueio. O nome da função, o esquema `extensions` ou o retorno `event_trigger`, isoladamente, não concedem exceção. O script não executa, altera, remove nem recria a rotina; também não concede privilégios. O `REVOKE ... CASCADE` pertence ao corpo oficial inspecionado, não à operação de limpeza.

`inspect_log_consumers.sql` retorna `recognized_platform_grant`, `source_sha256`, `blocking_routines` e `blocking_views`. A consulta e a limpeza usam o mesmo predicado, conferido pelos testes. Listas vazias não dispensam as demais verificações nem a revisão de consumidores externos. A limpeza repete a verificação dentro da transação antes do descarte.

O arquivo `fixtures/grant_pg_cron_access.sql.txt` contém somente o corpo oficial para testes, sob a licença em `fixtures/LICENSE.supabase`; não é uma migration nem um arquivo de manutenção para executar no legado.

### Testes do SQL

Além dos testes Python do runner, `test_sql_guard.mjs` executa a proteção real extraída do SQL em um PostgreSQL isolado via PGlite. Instale `@electric-sql/pglite@0.5.10` em uma pasta temporária fora do repositório e informe o caminho absoluto de `dist/index.js` por `PGLITE_MODULE_PATH`:

```bash
PGLITE_MODULE_PATH=/tmp/i9-maintenance-test-runtime/node_modules/@electric-sql/pglite/dist/index.js node ops/maintenance/test_sql_guard.mjs
```

Os casos verificam a definição oficial, alterações de corpo e de atributos, eventos incompatíveis e outros consumidores. Não exigem credenciais e não se conectam a bancos externos. Essa validação não substitui a conferência da definição instalada e das condições do banco antes da execução real.

## Backup e migração

O exportador `legacy-migration-export` exige usuário administrativo válido do aplicativo e vínculo ativo com o tenant; sua implantação deve ser confirmada. Ele produz arquivos no próprio projeto antigo e precisa de capacidade de escrita. É necessário copiar o resultado para fora do projeto e verificar a restauração.

Esse exportador não substitui um backup PostgreSQL completo: exporta dados expostos pela Data API e metadados Auth sanitizados, não schema completo, policies, funções, triggers, senhas/hashes ou secrets. Binários de Storage exigem cópia separada. Paginação sem snapshot transacional requer controle de escritas e reconciliação para obter uma migração consistente.
