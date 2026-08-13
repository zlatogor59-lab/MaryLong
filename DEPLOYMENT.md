# Test deployment runbook

This deployment is for synthetic data only.

## Update

1. Run `pnpm test`, `pnpm build`, and `pnpm smoke:production`.
2. Commit reviewed server changes to `main` and push to the private GitHub repository.
3. Render auto-deploys the commit and runs `prisma migrate deploy` before starting the server.
4. Confirm the Render deploy is successful, then run `pnpm smoke:production` again.
5. Perform one interactive OIDC login, verify only synthetic clients are visible, then test logout.

Never commit `.env`, database credentials, encryption keys, access tokens, questionnaire files, or client data.

## Rollback

1. In Render, open the last known-good deploy and choose **Rollback**.
2. Confirm `/api/v1/health` and run `pnpm smoke:production`.
3. Do not roll back a database migration by editing production data. Create and test a forward corrective migration instead.
4. If data integrity is in doubt, stop imports and restore only through the provider's tested restore procedure.

## Before real client data

Move to a production-grade paid service and database, configure tested backups/restores, retention and deletion procedures, DPA/GDPR controls, secret rotation, monitoring, and an independent security review.
