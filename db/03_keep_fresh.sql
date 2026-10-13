-- =====================================================================
--  Keep the demo "live": slide every timestamp forward by whole hours so
--  the newest sample is the current hour (hourly market data stays
--  aligned). The `refresher` service in docker-compose.yml calls this
--  every 15 minutes.
-- =====================================================================
CREATE OR REPLACE FUNCTION plant.shift_to_now() RETURNS interval
LANGUAGE plpgsql AS $$
DECLARE
    d interval;
BEGIN
    -- whole hours only, and never past now()
    SELECT floor(extract(epoch FROM now() - max(ts)) / 3600) * interval '1 hour' INTO d FROM plant.asset_power;
    IF d IS NULL OR d < interval '1 hour' THEN
        RETURN interval '0';
    END IF;
    UPDATE plant.asset_power SET ts = ts + d;
    UPDATE plant.weather     SET ts = ts + d;
    UPDATE plant.bess_state  SET ts = ts + d;
    UPDATE plant.site_meter  SET ts = ts + d;
    UPDATE plant.market      SET ts = ts + d;
    UPDATE plant.downtime    SET start_ts = start_ts + d, end_ts = end_ts + d;
    RETURN d;
END $$;
