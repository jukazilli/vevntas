# Relatório de recuperação

## Fontes verificadas

- Projeto Vercel: `vevntas` (`prj_DTYFYjrr1R7OpCGLSYnHRcb7T0HM`).
- Deploy ativo: `dpl_H1TsxYqeMNZErGYWCdrhifAJFt33`.
- Projeto Supabase: `vevntas` (`keivwlssgyelmvjgqayq`, região `sa-east-1`).
- Bundle cliente do deploy e metadados do build Next.js 16.1.6.
- Catálogo PostgreSQL para colunas, chaves, índices, funções, triggers, views e políticas RLS.

## Situação encontrada

O deploy não apresentava vínculo com um repositório Git. Por isso, não foi possível obter o histórico de commits ou restaurar o código-fonte byte a byte. A aplicação foi reconstruída com base no comportamento público do bundle e na lógica preservada no banco.

O banco possuía zero registros em todas as tabelas públicas no momento da recuperação. Nenhuma massa fictícia foi criada.

## Itens preservados

- Domínio funcional e navegação principal.
- Identidade Vevntas e slogan.
- Papéis e regras de acesso.
- Modelo relacional.
- Funções transacionais originais do PostgreSQL.
- Políticas de segurança por loja.
- Contratos das APIs utilizadas pelo frontend.
- Regras de USD/VES e proteção do custo de compra.

## Limites

- Não há histórico Git original.
- Artefatos minificados não preservam nomes internos, comentários nem organização original dos componentes.
- A tela de usuários foi mantida como próxima etapa, pois o bundle indicava a seção, mas não um fluxo administrativo concluído.
