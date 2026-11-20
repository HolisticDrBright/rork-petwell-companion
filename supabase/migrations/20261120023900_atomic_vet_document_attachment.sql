create function public.attach_vet_document(p_pet_id uuid,p_path text,p_title text,p_size integer)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  if private.pet_role(p_pet_id) is distinct from 'owner'
    or p_path is null or left(p_path,37) is distinct from (auth.uid()::text || '/')
    or char_length(p_path) > 250 then raise insufficient_privilege; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200
    or p_size is null or p_size not between 1 and 6000000 then raise invalid_parameter_value; end if;
  insert into public.vet_records (pet_id,owner_id,category,title,record_date)
    values (p_pet_id,auth.uid(),'Documents',p_title,current_date::text)
    returning id into result;
  insert into public.document_uploads (pet_id,owner_id,record_id,title,storage_path,mime_type,size_bytes)
    values (p_pet_id,auth.uid(),result,p_title,p_path,'image/jpeg',p_size);
  return result;
end;
$$;
revoke all on function public.attach_vet_document(uuid,text,text,integer) from public, anon;
grant execute on function public.attach_vet_document(uuid,text,text,integer) to authenticated;
