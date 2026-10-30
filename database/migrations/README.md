# Database Migrations

This directory contains versioned SQL migration scripts for the Seshachala Fee Management application.

## How to execute migrations

Run via npm script:
```powershell
npm run migrate
```

To check migration status:
```powershell
npm run migrate:status
```

## Executing in MySQL Workbench
1. Open MySQL Workbench and connect to your local MySQL server instance.
2. Ensure the database exists:
   ```sql
   CREATE DATABASE IF NOT EXISTS seshachala_fee_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE seshachala_fee_management;
   ```
3. Open `001_initial.sql` in MySQL Workbench and execute the script.
