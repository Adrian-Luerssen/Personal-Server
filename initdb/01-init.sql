-- create airflow db + user for your Airflow services
CREATE USER airflow_user WITH PASSWORD 'airflow_password';
CREATE DATABASE airflow_db OWNER airflow_user;
GRANT ALL PRIVILEGES ON DATABASE airflow_db TO airflow_user;

-- optional: grant your app user broader access if you need cross-db ops
-- GRANT ALL PRIVILEGES ON DATABASE mydatabase TO myuser;
