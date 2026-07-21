-- Client-side progression writes (badges / achievements / missions).
-- Idempotent: safe to re-run after 20260721180929_progression_engine.sql.

DROP POLICY IF EXISTS "Users insert own badges" ON public.user_badges;
CREATE POLICY "Users insert own badges"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own achievements" ON public.user_achievements;
CREATE POLICY "Users insert own achievements"
  ON public.user_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own achievements" ON public.user_achievements;
CREATE POLICY "Users update own achievements"
  ON public.user_achievements FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own missions" ON public.user_missions;
CREATE POLICY "Users insert own missions"
  ON public.user_missions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own missions" ON public.user_missions;
CREATE POLICY "Users update own missions"
  ON public.user_missions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Idempotent policy recreation (fixes re-apply on environments that already ran base migration)
DROP POLICY IF EXISTS "Active progression badges are readable" ON public.progression_badges;
CREATE POLICY "Active progression badges are readable"
  ON public.progression_badges FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Active progression achievements are readable" ON public.progression_achievements;
CREATE POLICY "Active progression achievements are readable"
  ON public.progression_achievements FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Active progression missions are readable" ON public.progression_missions;
CREATE POLICY "Active progression missions are readable"
  ON public.progression_missions FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Level unlock defs are readable" ON public.progression_level_unlocks;
CREATE POLICY "Level unlock defs are readable"
  ON public.progression_level_unlocks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users read own progress" ON public.user_progress;
CREATE POLICY "Users read own progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users read own xp ledger" ON public.xp_ledger;
CREATE POLICY "Users read own xp ledger"
  ON public.xp_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users read own badges" ON public.user_badges;
CREATE POLICY "Users read own badges"
  ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own badge pins" ON public.user_badges;
CREATE POLICY "Users update own badge pins"
  ON public.user_badges FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own achievements" ON public.user_achievements;
CREATE POLICY "Users read own achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users read own missions" ON public.user_missions;
CREATE POLICY "Users read own missions"
  ON public.user_missions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users read own streaks" ON public.user_streaks;
CREATE POLICY "Users read own streaks"
  ON public.user_streaks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Earned badges are public" ON public.user_badges;
CREATE POLICY "Earned badges are public"
  ON public.user_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read user progress levels" ON public.user_progress;
CREATE POLICY "Public can read user progress levels"
  ON public.user_progress FOR SELECT
  USING (true);
