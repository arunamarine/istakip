-- ============================================================
-- İş Takip Sistemi — Supabase Veritabanı Şeması
-- Supabase Dashboard > SQL Editor'a yapıştırıp çalıştırın
-- ============================================================

-- 1. Kullanıcı profilleri (Supabase Auth ile senkronize)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null default 'staff' check (role in ('manager', 'staff')),
  avatar_color text not null default '#E1F5EE',
  created_at timestamptz default now()
);

-- 2. Görevler
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'mid' check (priority in ('low', 'mid', 'high')),
  assignee_id uuid references public.users(id) on delete set null,
  created_by uuid references public.users(id) on delete set null not null,
  start_date date,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Yorumlar
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 4. Bildirimler
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  task_id uuid references public.tasks(id) on delete cascade,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- Otomatik updated_at güncelleyici
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function update_updated_at();

-- ============================================================
-- Yeni kullanıcı auth kaydında otomatik profil oluştur
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#E1F5EE')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Görev atama / güncelleme bildirimi fonksiyonu
-- ============================================================
create or replace function notify_on_task_change()
returns trigger as $$
begin
  -- Yeni görev atandığında
  if (TG_OP = 'INSERT' and new.assignee_id is not null and new.assignee_id != new.created_by) then
    insert into public.notifications (user_id, title, body, task_id)
    values (new.assignee_id, 'Yeni görev atandı', 'Size "' || new.title || '" görevi atandı.', new.id);
  end if;

  -- Durum değiştiğinde oluşturucuya bildir
  if (TG_OP = 'UPDATE' and old.status != new.status and new.created_by != new.assignee_id) then
    insert into public.notifications (user_id, title, body, task_id)
    values (new.created_by, 'Görev durumu güncellendi',
      '"' || new.title || '" görevi "' ||
      case new.status
        when 'todo' then 'Bekliyor'
        when 'doing' then 'Devam Ediyor'
        when 'done' then 'Tamamlandı'
      end || '" olarak güncellendi.', new.id);
  end if;

  -- Atanan kişi değiştiğinde yeni atanana bildir
  if (TG_OP = 'UPDATE' and old.assignee_id is distinct from new.assignee_id and new.assignee_id is not null) then
    insert into public.notifications (user_id, title, body, task_id)
    values (new.assignee_id, 'Görev size atandı', '"' || new.title || '" görevi size atandı.', new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger task_notification_trigger
  after insert or update on public.tasks
  for each row execute function notify_on_task_change();

-- ============================================================
-- Yorum eklendiğinde bildirim
-- ============================================================
create or replace function notify_on_comment()
returns trigger as $$
declare
  v_task public.tasks%rowtype;
  v_commenter public.users%rowtype;
  notify_uid uuid;
begin
  select * into v_task from public.tasks where id = new.task_id;
  select * into v_commenter from public.users where id = new.user_id;

  -- Görevi oluşturan ile atanan kişiden biri yorum yaptıysa diğerine bildir
  if new.user_id = v_task.assignee_id then
    notify_uid := v_task.created_by;
  else
    notify_uid := v_task.assignee_id;
  end if;

  if notify_uid is not null and notify_uid != new.user_id then
    insert into public.notifications (user_id, title, body, task_id)
    values (notify_uid, 'Yeni yorum',
      v_commenter.name || ', "' || v_task.title || '" görevine yorum ekledi.', new.task_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger comment_notification_trigger
  after insert on public.comments
  for each row execute function notify_on_comment();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Kullanıcılar: herkes okuyabilir, sadece kendini güncelleyebilir
create policy "users_select" on public.users for select to authenticated using (true);
create policy "users_update" on public.users for update to authenticated using (auth.uid() = id);

-- Görevler: herkes okuyabilir, yöneticiler ekleyip silebilir, atanan güncelleyebilir
create policy "tasks_select" on public.tasks for select to authenticated using (true);
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'manager'));
create policy "tasks_update" on public.tasks for update to authenticated
  using (
    auth.uid() = assignee_id or
    exists (select 1 from public.users where id = auth.uid() and role = 'manager')
  );
create policy "tasks_delete" on public.tasks for delete to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'manager'));

-- Yorumlar: herkes okuyabilir ve ekleyebilir
create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments_delete" on public.comments for delete to authenticated using (auth.uid() = user_id);

-- Bildirimler: sadece kendi bildirimlerini görebilir
create policy "notifs_select" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifs_update" on public.notifications for update to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Realtime aktif et
-- ============================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- Test verisi (opsiyonel — geliştirme için)
-- Önce Supabase Auth'tan 2 kullanıcı kaydedin, sonra ID'leri buraya yazın
-- ============================================================
-- insert into public.users (id, name, email, role, avatar_color) values
--   ('UUID_YONETICI', 'Ahmet Yılmaz', 'ahmet@sirket.com', 'manager', '#E1F5EE'),
--   ('UUID_CALISAN',  'Zeynep Kaya',  'zeynep@sirket.com', 'staff',   '#EEEDFE');
