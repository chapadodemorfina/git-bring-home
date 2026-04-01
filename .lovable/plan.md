

## Diagnóstico: Erro RLS ao criar lançamento financeiro

### Causa raiz

O erro "new row violates row-level security policy for table financial_entries" ocorre de forma **intermitente** quando o cabeçalho `x-tenant-id` ainda não foi definido no momento da requisição. Isso acontece em dois cenários:

1. **Race condition**: O usuário navega para `/finance/new` antes do `TenantContext` terminar de carregar os tenants
2. **Acesso direto via URL**: O usuário abre a URL diretamente no navegador (bookmark, link), e a requisição de INSERT acontece antes do tenant estar resolvido

Quando o header está ausente, a função `get_active_tenant_id()` faz fallback para o tenant padrão do usuário (passo 3 da função). Porém, o trigger `set_tenant_id_on_insert` também usa `get_active_tenant_id()`, e **ambos devem concordar** para o `WITH CHECK` da policy RESTRICTIVE passar. Se houver qualquer timing diferente entre trigger e policy evaluation, o check falha.

A função `has_any_role()` também depende de `get_active_tenant_id()` — se retornar NULL no contexto da policy permissiva, o INSERT é negado.

### Plano de correção

#### 1. Proteção no frontend: bloquear mutations antes do tenant carregar

No hook `useCreateFinancialEntry`, adicionar verificação de que o tenant está ativo antes de permitir o INSERT. No `FinanceCreatePage`, mostrar loading enquanto tenant não carregou.

**Arquivo**: `src/modules/finance/pages/FinanceCreatePage.tsx`
- Importar `useTenant` do TenantContext
- Se `loading` estiver true ou `activeTenant` for null, mostrar skeleton/loading
- Desabilitar o botão "Salvar" se tenant não estiver definido

#### 2. Incluir `created_by` no payload de criação

O campo `created_by` é nullable, mas preenchê-lo com `auth.uid()` melhora rastreabilidade e pode evitar problemas futuros com policies que dependam do criador.

**Arquivo**: `src/modules/finance/hooks/useFinance.ts`
- No `useCreateFinancialEntry`, buscar o `user` do `useAuth()` e incluir `created_by: user?.id` no payload

#### 3. Proteção global: componente ProtectedPage aguardar tenant

Verificar se o componente `ProtectedPage` (usado em todas as rotas protegidas) já aguarda o `TenantContext` carregar. Se não, adicionar essa verificação para prevenir esse tipo de erro em **todos os módulos**.

**Arquivo**: `src/App.tsx` (componente `ProtectedPage` inline) ou `src/components/ProtectedRoute.tsx`

### Impacto

- Zero alteração em lógica de negócio, queries ou mutations
- Previne o erro em todos os módulos que usam `ProtectedPage`
- Corrige a causa raiz (timing) em vez de tratar sintoma

