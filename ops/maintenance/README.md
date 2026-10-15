# Manutenção dos logs internos

A manutenção atua exclusivamente em `cron.job_run_details`, `net._http_response` e no job `daily-cleanup-internal-logs` do projeto `moijoyqwapimforpijdc`.

## Execução

1. Execute `inspect_internal_logs.sql` para registrar tamanhos e metadados dos jobs. A consulta não varre registros dos logs, corpos de funções ou dependências.
2. Execute `cleanup_internal_logs.sql` como uma única operação, com parada em erro. O script limpa os dois logs e cria ou atualiza o job nomeado de retenção na mesma transação.
3. Confirme o resultado após o commit e compare os tamanhos e jobs. Em caso de timeout ou desconexão, consulte o estado antes de repetir; o commit pode ter ocorrido sem resposta ao cliente.

O SQL não faz validações personalizadas de dependências, conteúdo de funções, hashes, proprietários, registros cron inacabados ou definições de extensões. Referências em `extensions.grant_pg_cron_access()` não bloqueiam a manutenção. Continuam valendo os privilégios e restrições nativos do PostgreSQL.

A transação usa timeouts de lock e execução. `TRUNCATE ONLY ... CONTINUE IDENTITY RESTRICT` mantém as sequências e não apaga tabelas por cascata. A limpeza imediata remove todo o histórico dos dois logs, inclusive entradas recentes e execuções em andamento; não cancela os jobs. Após o commit, o histórico removido depende de backup prévio para recuperação. Triggers ON TRUNCATE existentes seguem o comportamento nativo do PostgreSQL.

O job `daily-cleanup-internal-logs` executa `0 6 * * *` no fuso configurado do cron. Em GMT, corresponde a 03h em São Paulo. Remove registros cron concluídos com status `succeeded`/`failed` e término anterior a três dias, além de respostas HTTP com mais de três dias. O nome é reutilizado pelo mesmo usuário executor; não há alteração no agendamento das notificações. A retenção por DELETE permite reutilização de espaço após vacuum, mas não garante redução física imediata.

## Banco em somente leitura

Se o Supabase colocou a conexão administrativa em somente leitura por capacidade, o procedimento oficial permite `SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE` antes da transação de limpeza, na mesma sessão. Esse ajuste não altera configurações globais nem concede privilégios. Não se aplica a uma réplica ou a uma conexão sem autoridade de escrita.

Fonte: https://supabase.com/docs/guides/platform/database-size#disabling-read-only-mode

## Executor e workflow

O workflow `Internal database log maintenance` tem somente acionamento manual; nenhum push ou deploy executa limpeza. O runner usa `SUPABASE_ACCESS_TOKEN` com acesso legítimo ao legado, confirma o projeto exato e não repete escritas automaticamente. O modo `apply` exige `--confirm-project moijoyqwapimforpijdc`, sem parâmetro de revisão de dependências. As verificações posteriores confirmam a retenção e a preservação dos demais jobs.

## Validação local

```bash
python3 -m unittest discover -s ops/maintenance -p 'test_*.py'
PGLITE_MODULE_PATH=/tmp/i9-maintenance-test-runtime/node_modules/@electric-sql/pglite/dist/index.js node ops/maintenance/test_sql_guard.mjs
```

O teste SQL usa PostgreSQL via `@electric-sql/pglite@0.5.10`, instalado fora do aplicativo. O agendador cron é substituído por uma implementação local de teste; as extensões e o banco real não são executados. O teste verifica o efeito da limpeza, a retenção, os jobs existentes e o rollback transacional.

## Backup

Após recuperar o acesso, o painel `/admin-hub?tab=backup` permite exportação pelo usuário administrativo autorizado. O ZIP do painel é parcial, limitado por RLS e não transacional; não substitui um backup PostgreSQL completo. Esta manutenção não gera backup, não importa dados e não modifica o sistema novo.
