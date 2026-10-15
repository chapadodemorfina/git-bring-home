# Recuperação autorizada do legado i9

- [x] Confirmar integração com moijoyqwapimforpijdc e medir os dois logs técnicos.
- [x] Ler os scripts existentes da PR #2 e testar Auth/Data API separadamente.
- [ ] Executar limpeza e retenção: script original da PR #2 submetido em 15/10/2026 às 14:23 UTC; supabase--migration novamente desativada por preferência de aprovação, sem execução. Modo somente leitura permanece bloqueio independente.
- [x] Consultar dependências em consultas menores: nenhuma FK, trigger customizada, herança ou view; rotina extensions.grant_pg_cron_access referencia os logs e exige revisão preservando o bloqueio do script original. Nenhum consumidor encontrado em src, ops ou supabase/functions.
- [x] Verificar tamanhos e agendamentos: banco 557304979 bytes; cron 218382336 bytes; HTTP 270721024 bytes; somente process-notifications-every-minute entre os dois nomes consultados, ativo a cada minuto, proprietário postgres. Retenção diária não encontrada. Fuso GMT.
- [ ] Validar login, get_user_roles e tenant: sessão external_unmanaged; última checagem Auth expirou em 15 segundos e Data API retornou 401 Invalid API key; testes autenticados indisponíveis.
- [ ] Obter e verificar backup atual: sem exportação integral disponível pela integração e sem sessão autorizada para o painel existente.

Nenhuma alteração de código, dados operacionais, Storage, RLS, notificações ou projeto novo foi aplicada.