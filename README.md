# Vevntas

Repositório do sistema **Vevntas**, reconstruído a partir do deploy existente e da estrutura ativa do Supabase.

O código-fonte está localizado na pasta [`vevntas/`](./vevntas).

## Executar localmente

```bash
git clone https://github.com/jukazilli/vevntas.git
cd vevntas/vevntas
cp .env.example .env.local
npm install
npm run dev
```

Configure no arquivo `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

## Conteúdo recuperado

- Aplicação Next.js 16 com React 19 e TypeScript;
- autenticação e controle de acesso com Supabase;
- consulta de preços em USD e conversão para VES;
- cadastro de produtos e ajuste de estoque;
- vendas, pagamentos e movimentações de estoque;
- importação de produtos por XLSX;
- relatórios e configuração da taxa de câmbio;
- migração SQL com tabelas, funções, gatilhos, índices e políticas RLS.

Consulte [`vevntas/RECOVERY.md`](./vevntas/RECOVERY.md) para os detalhes da recuperação técnica.
