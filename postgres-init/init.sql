-- Create app database
SELECT 'CREATE DATABASE kitatolongkita'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kitatolongkita')\gexec

-- Create admin database
SELECT 'CREATE DATABASE kitatolongkita_admin'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kitatolongkita_admin')\gexec
