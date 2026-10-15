# Backup pelo painel da i9 Solution

O administrador usa a própria conta do sistema em **Administração → Backup**
(`/admin-hub?tab=backup`). Não é necessário entrar no dashboard do Supabase.

1. Escolha a empresa correta e reserve um período sem alterações nos registros.
2. Leia o escopo, marque a confirmação e clique em **Preparar backup**.
3. Aguarde nesta aba. Trocar de empresa, sair da conta ou sair da aba cancela o trabalho.
4. Confira as pendências e clique em **Baixar arquivo ZIP**. A preparação, sozinha,
   não salva o arquivo no computador.
5. Guarde o ZIP em local privado e valide o relatório antes de iniciar a migração.

## Conteúdo e limites

- Manifesto fixo de 85 tabelas conhecidas do código, com colunas explícitas.
- Somente linhas visíveis à conta pelas políticas RLS e pertencentes à empresa
  selecionada. Perfis são limitados aos usuários vinculados à empresa.
- Fotos de dispositivos, anexos de ordens de serviço e comprovantes de logística
  referenciados nos dados, quando o Storage permitir sua leitura.
- JSON dividido em páginas, mantendo os IDs de origem, e arquivos binários.
- `manifest.json` lista tabelas, contagens, arquivos, exclusões e pendências;
  cada arquivo tem tamanho e SHA-256. `manifest.sha256` verifica o manifesto.
- Campos conhecidos de senhas, tokens e chaves são excluídos ou ocultados.
  Configurações exportadas usam uma lista institucional explícita. Texto livre
  e anexos ainda podem conter informações sensíveis: trate todo o ZIP como privado.
- Limite de conteúdo bruto de 128 MiB, com reserva para o manifesto, e de 20 MiB
  por arquivo. O consumo de memória do navegador é maior por causa das estruturas
  e cópias intermediárias. Itens não copiados aparecem como pendências.

O resultado `completed` significa que as leituras do **escopo declarado** terminaram,
não que existe um dump integral. O manifesto sempre informa
`scope.partial_database: true`, `rls_visible_rows_only: true` e
`transactional_snapshot: false`. Resultado `partial` contém pendências explícitas
e não deve ser usado como única fonte para concluir uma migração.

Não inclui schemas internos, senhas/hashes do Auth, sessões, cron, net, SQL de
estrutura, políticas, funções, triggers, tabelas globais sem escopo, views, tabelas
desconhecidas ao código, logos, avatares, objetos órfãos ou URLs externas.
Políticas RLS podem ocultar linhas sem retornar erro; contagens também respeitam RLS.
Mesmo contagens iguais não detectam toda atualização concorrente. Uma pausa nas
alterações e a reconciliação no destino continuam necessárias.

## Acesso e comportamento

O código valida a sessão no servidor, vínculo ativo e papel `admin` na empresa,
antes e depois da exportação. Durante as páginas, confere usuário/empresa e cancela
se o contexto mudar. Todas as consultas têm escopo explícito; não há chave
administrativa no navegador, função nova no backend ou ampliação das políticas.
O limite final de acesso continua sendo a autorização existente no servidor.

Não grava a cópia no Supabase antigo, não chama `legacy-migration-export`, não
insere dados de negócio e não altera notificações. Precisa que o login do próprio
sistema e as APIs de leitura estejam operacionais. Se o disco cheio impedir o
login, esta funcionalidade não remove esse bloqueio.

## Limpeza e migração

Esta interface não executa `TRUNCATE` nem altera cron. Os comandos de manutenção
preparados na PR #2 precisam de uma conexão administrativa autorizada ao projeto
`moijoyqwapimforpijdc`. A chave `anon` do `.env` não fornece essa permissão; um
deploy do frontend não cria funções/RPCs no banco.

O novo projeto `figvvucvckgnakkwglea` já contém uma importação histórica em staging.
Antes de importar este formato `i9-tenant-export/1`, valide os hashes e reconcilie
`source_table` + ID original com os mapas já existentes. Não execute uma importação
cega: a unicidade por lote não elimina duplicatas entre dois backups diferentes.
Não há restauração automática nem mudança de conexão de produção neste patch.

## Desenvolvimento

O `bun.lock` de origem é o lockfile coerente com o `package.json`. Instalação usada:
`bun@1.3.9 install --frozen-lockfile --ignore-scripts`. `fflate@0.8.2`, já presente
transitivamente, foi declarado como dependência direta para gerar o ZIP.
As versões existentes das demais dependências foram preservadas.

O `package-lock.json` anterior já estava desatualizado e `npm ci` falhava antes
da implementação; este patch registra somente a dependência direta adicional.
Use o lockfile Bun para reproduzir a validação, sem atualização geral de bibliotecas.

Validação: testes do exportador e da interface, TypeScript e build de produção.
Os testes usam dados sintéticos. A existência de código testado não significa que
um backup real foi obtido ou que o banco antigo foi limpo.
