-- SQL Migration Script for Saudi Regulations Update
-- Description: Removes document_number, adds title, and updates existing records.

-- 1. Add 'title' column to support custom document names
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- 2. Populate 'title' for existing standard documents based on their type
UPDATE documents SET title = 'رخصة القيادة' WHERE type = 'license';
UPDATE documents SET title = 'استمارة السيارة' WHERE type = 'registration';
UPDATE documents SET title = 'التأمين' WHERE type = 'insurance';

-- 3. Remove 'document_number' column as it is no longer needed
ALTER TABLE documents DROP COLUMN IF EXISTS document_number;
