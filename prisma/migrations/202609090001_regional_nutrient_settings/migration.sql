CREATE TABLE client_regional_nutrient_settings (
  client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  market_country varchar(16) NOT NULL,
  updated_by uuid NOT NULL REFERENCES users(id),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_regional_market_country_check CHECK (market_country ~ '^[A-Z]{2}$' OR market_country IN ('MULTI','UNKNOWN'))
);

CREATE TABLE submission_regional_nutrient_settings (
  submission_id uuid PRIMARY KEY REFERENCES form_submissions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  market_country varchar(16) NOT NULL,
  updated_by uuid NOT NULL REFERENCES users(id),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_regional_market_country_check CHECK (market_country ~ '^[A-Z]{2}$' OR market_country IN ('MULTI','UNKNOWN'))
);

CREATE INDEX submission_regional_nutrient_settings_client_idx ON submission_regional_nutrient_settings(client_id);
