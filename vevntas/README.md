# Vevntas

Sistema de ventas e inventario para comercios venezolanos, con operación principal en USD y conversión vigente a VES.

> **Origen de este repositorio:** reconstrucción técnica realizada a partir del despliegue `vevntas.vercel.app` y del esquema activo del proyecto Supabase `keivwlssgyelmvjgqayq`. El código fuente original no estaba vinculado a Git. El banco consultado no contenía registros operativos; por eso este repositorio no incluye datos ficticios ni exportación de clientes, productos o ventas.

## Funcionalidades recuperadas

- Autenticación por correo y contraseña con Supabase Auth.
- Criação automática da loja e do primeiro administrador.
- Perfis `admin`, `cashier` e `stock` com controle por RLS.
- Consulta rápida de preços por nome, código ou código de barras.
- Preço de venda e custo de compra em USD, com conversão para VES.
- Ocultação do custo para operadores de caixa.
- Cadastro e atualização de produtos.
- Ajustes de estoque com histórico e motivo.
- Registro transacional de vendas, pagamentos e baixa de estoque.
- Importação XLSX de até 5 MB e 5.000 linhas.
- Auditoria e cancelamento transacional de venda no banco.
- Modos claro e escuro, fonte Nunito Sans e layout mobile-first.

## Stack

- Next.js 16 / React 19 / TypeScript
- Supabase Auth + PostgreSQL + RLS + RPC
- Vercel
- Lucide React
- `read-excel-file`

## Configuração local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

## Banco de dados

O arquivo `supabase/migrations/20260802175413_recovered_schema.sql` contém:

- 12 tabelas de negócio;
- view de taxa de câmbio vigente;
- índices;
- funções transacionais;
- gatilhos;
- políticas RLS;
- permissões mínimas para usuários autenticados.

Para um projeto Supabase novo:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

O projeto Supabase já existente **não precisa receber novamente a migração**, pois a estrutura foi recuperada dele.

## Primeira utilização

1. Configure as variáveis de ambiente.
2. Abra a aplicação e crie a primeira conta.
3. Confirme o e-mail, caso a verificação esteja ativa no Supabase.
4. Acesse **Configuração** e informe a taxa USD → VES.
5. Cadastre ou importe produtos.
6. Registre vendas.

## Modelo da planilha XLSX

Cabeçalhos reconhecidos, com aliases em espanhol e inglês:

| Campo | Cabeçalho recomendado |
|---|---|
| Código | `codigo` |
| Nome | `nombre` |
| Código de barras | `barcode` |
| Categoria | `categoria` |
| Unidade | `unidad` |
| Venda USD | `precio_venta_usd` |
| Compra USD | `costo_compra_usd` |
| Estoque | `existencia` |
| Estoque mínimo | `stock_minimo` |

## Segurança

- A chave `service_role` nunca é utilizada no frontend ou nas rotas.
- As APIs propagam o token do usuário e respeitam `auth.uid()`.
- Operações críticas são executadas por funções PostgreSQL atômicas.
- Custos de compra são protegidos para os perfis `admin` e `stock`.
- Não há credenciais ou dados reais versionados.

## Validação

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
