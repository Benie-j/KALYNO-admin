create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'gemini',
  model text not null,
  action text not null check (action in ('grade', 'assist')),
  input_tokens integer,
  output_tokens integer,
  thoughts_tokens integer,
  cached_tokens integer,
  tool_input_tokens integer,
  total_tokens integer,
  usage_available boolean not null default false,
  status text not null check (status in ('success', 'error')),
  error_code text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint ai_usage_logs_nonnegative_tokens check (
    (input_tokens is null or input_tokens >= 0) and
    (output_tokens is null or output_tokens >= 0) and
    (thoughts_tokens is null or thoughts_tokens >= 0) and
    (cached_tokens is null or cached_tokens >= 0) and
    (tool_input_tokens is null or tool_input_tokens >= 0) and
    (total_tokens is null or total_tokens >= 0) and
    (duration_ms is null or duration_ms >= 0)
  )
);

create index if not exists ai_usage_logs_created_at_idx
  on public.ai_usage_logs (created_at desc);
create index if not exists ai_usage_logs_action_created_idx
  on public.ai_usage_logs (action, created_at desc);
create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

alter table public.ai_usage_logs enable row level security;
grant select on public.ai_usage_logs to authenticated;

drop policy if exists "Admins can read AI usage logs" on public.ai_usage_logs;
create policy "Admins can read AI usage logs"
  on public.ai_usage_logs
  for select
  to authenticated
  using (public.is_admin());

comment on table public.ai_usage_logs is
  'Mesures de consommation IA par appel; aucun contenu pédagogique personnel.';
