-- Relax inbound_receipts pod_id-change trigger to permit NULL'ing.
--
-- The baseline trigger (prevent_inbound_receipts_pod_change, from
-- 20251218000000_baseline_schema.sql) blocked ANY change to pod_id once set,
-- to prevent accidental cross-pod data leak. The intent was "no cross-pod
-- reassignment" but the implementation also blocked legitimate NULL'ing —
-- which the orphan-audit reset path in supabase/manual/reset_account.sql
-- now requires in order to preserve inbound_receipts as LLM eval substrate
-- when a pod is wiped.
--
-- NULL'ing pod_id is operationally distinct from cross-pod reassignment: it
-- orphans the row, and the standard RLS policy (pod_id IN ...) makes such
-- rows service-role-only-visible afterward. The cross-pod-leak invariant
-- the trigger was protecting is preserved by the tightened check below —
-- only blocks when BOTH old and new pod_id are non-null AND distinct.

CREATE OR REPLACE FUNCTION public.prevent_inbound_receipts_pod_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pod_id IS NOT NULL
     AND NEW.pod_id IS NOT NULL
     AND NEW.pod_id IS DISTINCT FROM OLD.pod_id THEN
    RAISE EXCEPTION 'pod_id cannot be reassigned to a different pod (old %, new %)', OLD.pod_id, NEW.pod_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
