-- Support tickets table for rate limiting and tracking
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  title text not null,
  status text not null default 'sent',
  resend_message_id text,
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create index idx_support_tickets_user_created
  on public.support_tickets (user_id, created_at desc);
