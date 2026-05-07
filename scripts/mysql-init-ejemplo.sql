CREATE DATABASE IF NOT EXISTS biblioteca_crud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'biblioteca_app'@'%' IDENTIFIED BY 'cambiar_password';
GRANT ALL PRIVILEGES ON biblioteca_crud.* TO 'biblioteca_app'@'%';
FLUSH PRIVILEGES;
