# Security and publication boundaries

## What is included

The showcase copy includes application source, migrations, tests, configuration structure, Docker files, and generic menu imagery that was reviewed for visible private information.

## What is excluded

- Environment files and credentials.
- SQLite databases, database backups, dumps, exports, and generated archives.
- Production/customer records and private uploads.
- Editor settings, local Expo state, build output, route dumps, temporary files, and other generated clutter.
- Deployment-specific domains, contact details, map coordinates, mobile app identifiers, and EAS project identifiers.

The `.gitignore` rules are defense in depth, not a substitute for checking files before a commit. Copy the relevant `.env.example` file to a local ignored environment file and fill it only with local or separately managed values.

## Credential findings from the source history

The private source history contained a tracked local AI-provider configuration file with API-key material. That path is excluded from this showcase history. If those credentials are still active anywhere, revoke or rotate them through the provider; this repository preparation does not perform that external action.

The original history also contained a deleted SQLite backup with application records and deleted CSV exports. Those paths are excluded from the showcase history as well.

## Safe review checklist

Before publishing future changes:

1. Run `git status --short` and inspect every new file.
2. Check tracked files with `git ls-files` for environment, database, backup, and certificate names.
3. Search the full reachable history for provider keys, internal domains, and customer data.
4. Keep production values in a secret manager or local ignored files.
5. Do not use the showcase checkout to operate production services.
