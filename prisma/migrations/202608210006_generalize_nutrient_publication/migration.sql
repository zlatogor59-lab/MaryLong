ALTER TABLE "fat_client_explanation_approvals" RENAME TO "nutrient_client_explanation_approvals";
ALTER TABLE "nutrient_client_explanation_approvals" ADD COLUMN "nutrient_key" text NOT NULL DEFAULT 'fat';
ALTER TABLE "nutrient_client_explanation_approvals" ADD COLUMN "explanation_ciphertext" bytea;
ALTER TABLE "nutrient_client_explanation_approvals" DROP CONSTRAINT "fat_client_explanation_approvals_submission_id_key";
ALTER TABLE "nutrient_client_explanation_approvals" ADD CONSTRAINT "nutrient_client_explanation_submission_nutrient_key" UNIQUE ("submission_id","nutrient_key");
