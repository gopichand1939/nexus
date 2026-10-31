#!/bin/sh
set -eu
case "$NEXUS_DB_PASSWORD$MATRIX_DB_PASSWORD" in *[!a-zA-Z0-9_-]*) echo 'Invalid database password format' >&2; exit 1;; esac
psql --username "$POSTGRES_USER" --dbname postgres -v ON_ERROR_STOP=1 <<SQL
CREATE USER nexus_app WITH PASSWORD '$NEXUS_DB_PASSWORD';
CREATE USER nexus_matrix WITH PASSWORD '$MATRIX_DB_PASSWORD';
CREATE DATABASE nexus_app OWNER nexus_app;
CREATE DATABASE nexus_matrix OWNER nexus_matrix ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;
SQL
