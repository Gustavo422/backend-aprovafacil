-- Cria a função get_schema_info para retornar o schema real das tabelas do schema public
create or replace function public.get_schema_info()
returns table (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
language sql
as $$
  select
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position;
$$; 