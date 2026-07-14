-- Human live chat stores explicit admin replies while the existing AI guide
-- continues to use the user/assistant roles.
alter table public.chat_messages
  drop constraint if exists chat_messages_role_check;

alter table public.chat_messages
  add constraint chat_messages_role_check
  check (role in ('user', 'assistant', 'admin'));

comment on constraint chat_messages_role_check on public.chat_messages is
  'AI transcripts use user/assistant; human live chat additionally permits explicit admin replies.';
