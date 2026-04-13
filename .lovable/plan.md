

# Plano: Relatório PDF de Comissões de Parceiros

## Problema
Ao gerar comissões na aba "Fechamento Parceiros", o sistema calcula e exibe os dados, mas nao permite exportar um relatório detalhado em PDF com as OS vinculadas para enviar ao lider/parceiro.

## O que sera feito

### 1. Criar gerador PDF de comissoes de parceiro
Novo arquivo `src/lib/pdf-generators/cp-commission-report-pdf.ts` que gera um PDF profissional contendo:
- Cabecalho com nome da empresa e periodo
- Nome do parceiro (ponto de coleta)
- Resumo: total de OS, faturamento, tipo de comissao, valor da comissao
- Tabela detalhada com todas as OS do periodo (numero, cliente, status, valor)
- Total geral ao final
- Rodape com creditos

Utilizara os helpers existentes de `pdf-utils.ts` (createPdf, addHeader, addTable, addTotalBox, savePdf) para manter consistencia visual com os demais PDFs do sistema.

### 2. Adicionar botao "Exportar PDF" no painel de detalhes
No `CpCommissionPeriodsPage.tsx`, dentro do Sheet de detalhes (que ja exibe as OS do parceiro), adicionar um botao "Exportar PDF" que:
- Coleta os dados do periodo selecionado + lista de OS
- Chama o gerador PDF
- Faz o download automatico do arquivo

### 3. Adicionar botao "Exportar PDF" na linha da tabela
Na tabela principal de comissoes, ao lado dos botoes "Detalhes/Aprovar/Pagar", adicionar um botao de download rapido que abre o sheet de detalhes ou gera o PDF diretamente.

## Detalhes tecnicos
- O PDF sera gerado client-side com jsPDF + jspdf-autotable (ja instalados)
- Dados das OS vem do hook `usePeriodOrders` que ja existe
- Informacoes da empresa vem de `useCompanySettings` (ja usado em outros PDFs)
- Nenhuma alteracao de banco de dados necessaria

