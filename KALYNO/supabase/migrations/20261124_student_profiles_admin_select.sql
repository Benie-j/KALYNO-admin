-- Déjà appliquée sur le projet Supabase de production le 24/11/2026.
-- Cette migration conserve la modification dans l'historique Git du projet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'student_profiles_admin_select'
  ) THEN
    CREATE POLICY student_profiles_admin_select
      ON public.student_profiles
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END
$$;
