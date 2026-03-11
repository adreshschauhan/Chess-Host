-- Add a nullable unique key to enforce at most one active tournament.

ALTER TABLE `Tournament`
  ADD COLUMN `activeKey` VARCHAR(16) NULL;

-- If prior bugs created multiple active tournaments, keep the newest active and deactivate the rest.
SET @keep := (
  SELECT `id`
  FROM `Tournament`
  WHERE `active` = 1
  ORDER BY `id` DESC
  LIMIT 1
);

UPDATE `Tournament`
SET `active` = CASE WHEN `id` = @keep THEN 1 ELSE 0 END
WHERE `active` = 1;

UPDATE `Tournament`
SET `activeKey` = 'ACTIVE'
WHERE `id` = @keep;

CREATE UNIQUE INDEX `Tournament_activeKey_key` ON `Tournament`(`activeKey`);
