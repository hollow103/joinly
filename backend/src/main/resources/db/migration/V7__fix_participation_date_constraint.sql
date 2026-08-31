-- Corrects V3: the original participations_dates_match_status required resolved_at IS NOT NULL on
-- 'abandoned' rows, which contradicts docs/13 (resolved_at belongs to confirmed/rejected). The real
-- lifecycle is pending -> confirmed (sets resolved_at) -> abandoned (adds abandoned_at), so an
-- abandoned row keeps whatever resolved_at it had and only abandoned_at is required.
ALTER TABLE participations DROP CONSTRAINT participations_dates_match_status;

ALTER TABLE participations ADD CONSTRAINT participations_dates_match_status CHECK (
    (status = 'pending'   AND resolved_at IS NULL     AND abandoned_at IS NULL)
    OR (status = 'confirmed' AND resolved_at IS NOT NULL AND abandoned_at IS NULL)
    OR (status = 'rejected'  AND resolved_at IS NOT NULL AND abandoned_at IS NULL)
    OR (status = 'abandoned' AND abandoned_at IS NOT NULL)
);
