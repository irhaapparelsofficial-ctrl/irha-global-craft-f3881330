# Release Health deployment

This directory contains the admin-only, read-only production release evidence function.

Deployment requirements:

- owner Supabase project: `pvzjiozismyxqrzmtfbi`
- JWT verification: enabled
- caller must be an authenticated user with the `admin` role
- supported action: `read`
- no deployment, migration, message, payment, shipment or data mutation is performed by the function

The file is retained so exact-main function synchronization detects and verifies this function package.
