-- Add setupDone flag to track whether tournament setup has been finalized by admin.

ALTER TABLE `Tournament`
  ADD COLUMN `setupDone` BOOLEAN NOT NULL DEFAULT false;
