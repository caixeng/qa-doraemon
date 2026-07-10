-- ============================================================================
-- Migration 024: Move `unaccent` extension out of the public schema
-- (advisor: extension_in_public). The four search-helper functions from 019
-- referenced public.unaccent explicitly, so they are updated in lockstep.
-- ============================================================================

ALTER EXTENSION unaccent SET SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.full_name_unaccent(students)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
  SELECT extensions.unaccent($1.full_name);
$function$;

CREATE OR REPLACE FUNCTION public.full_name_unaccent(users)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
  SELECT extensions.unaccent($1.full_name);
$function$;

CREATE OR REPLACE FUNCTION public.child_full_name_unaccent(enrollments)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
  SELECT extensions.unaccent($1.child_full_name);
$function$;

CREATE OR REPLACE FUNCTION public.guardian_name_unaccent(enrollments)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
  SELECT extensions.unaccent($1.guardian_name);
$function$;
