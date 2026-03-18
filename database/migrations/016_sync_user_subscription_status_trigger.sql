-- Sync users.subscription_status based on subscriptions table

CREATE OR REPLACE FUNCTION sync_user_subscription_status()
RETURNS TRIGGER AS $$
DECLARE
  has_active BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.user_id = NEW.user_id
      AND s.status = 'active'
      AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
  ) INTO has_active;

  IF has_active THEN
    UPDATE users SET subscription_status = 'active' WHERE id = NEW.user_id;
  ELSE
    UPDATE users SET subscription_status = 'inactive' WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_subscription_status ON subscriptions;
CREATE TRIGGER trg_sync_user_subscription_status
AFTER INSERT OR UPDATE OR DELETE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_user_subscription_status();