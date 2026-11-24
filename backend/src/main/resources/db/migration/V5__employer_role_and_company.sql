-- Add ROLE_EMPLOYER and employer company_name column
INSERT IGNORE INTO roles (name) VALUES ('ROLE_EMPLOYER');

ALTER TABLE users
    ADD COLUMN company_name VARCHAR(160) NULL;
