-- Fase 2A.1: Garantir estruturalmente um único draft de revisão por quote pai
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_one_draft_revision_per_parent
  ON public.quotes(parent_quote_id)
  WHERE parent_quote_id IS NOT NULL AND status = 'draft';