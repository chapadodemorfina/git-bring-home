# Recuperação autorizada do legado i9

- [x] Confirmar integração com moijoyqwapimforpijdc e medir os dois logs técnicos.
- [x] Ler os scripts existentes da PR #2 e testar Auth/Data API separadamente.
- [ ] Executar limpeza e retenção: após confirmação do usuário, duas consultas somente leitura retornaram conexão pooler indisponível; não foi possível verificar o estado, portanto a limpeza não foi repetida.
- [ ] Validar dependências e agendamentos: consulta de dependências expirou; interface segura de agendamentos indisponível nesta sessão.
- [ ] Validar login, get_user_roles e tenant: sessão external_unmanaged; Auth health 200 e Data API 401 novamente em 15/10/2026; testes autenticados indisponíveis.
- [ ] Obter e verificar backup atual: sem exportação integral disponível pela integração e sem sessão autorizada para o painel existente.

Nenhuma alteração de código, dados operacionais, Storage, RLS, notificações ou projeto novo foi aplicada.