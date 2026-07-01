-- Seed data. Source of truth for these values is @mating/shared
-- (config/eligibility REGION_DEFINITIONS); keep this file in sync with it.

-- config/regions (M1): Pakistan and United States dual-launch (both active).
-- eligibility, compliance flags, and supported payment methods.
insert into public.regions (code, name, currency_code, default_locale, locales, active, config)
values
  (
    'PK',
    'Pakistan',
    'PKR',
    'en',
    array['en', 'ur'],
    true,
    '{
      "eligibility": {
        "species": {
          "cattle":  { "minAgeMonths": 18, "requiresHealthCheck": true, "requiresVaccination": true },
          "buffalo": { "minAgeMonths": 24, "requiresHealthCheck": true, "requiresVaccination": true },
          "goat":    { "minAgeMonths": 12, "requiresHealthCheck": true, "requiresVaccination": true },
          "sheep":   { "minAgeMonths": 12, "requiresHealthCheck": true, "requiresVaccination": true },
          "dog":     { "minAgeMonths": 18, "requiresHealthCheck": true, "requiresVaccination": true }
        },
        "defaults": { "minAgeMonths": 12, "requiresHealthCheck": true, "requiresVaccination": true }
      },
      "compliance": {
        "subdivisions": [
          "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
          "Gilgit-Baltistan", "Azad Jammu and Kashmir", "Islamabad Capital Territory"
        ],
        "exoticRequiresApproval": true,
        "kycRequiredForPayments": true
      },
      "paymentMethods": ["easypaisa", "jazzcash", "bank_transfer"]
    }'::jsonb
  ),
  (
    'US',
    'United States',
    'USD',
    'en',
    array['en'],
    true,
    '{
      "eligibility": {
        "species": {
          "cattle": { "minAgeMonths": 15, "requiresHealthCheck": true, "requiresVaccination": true },
          "dog":    { "minAgeMonths": 24, "requiresHealthCheck": true, "requiresVaccination": true }
        },
        "defaults": { "minAgeMonths": 12, "requiresHealthCheck": true, "requiresVaccination": true }
      },
      "compliance": {
        "subdivisions": [],
        "exoticRequiresApproval": true,
        "kycRequiredForPayments": true
      },
      "paymentMethods": ["stripe"]
    }'::jsonb
  )
on conflict (code) do update set
  name = excluded.name,
  currency_code = excluded.currency_code,
  default_locale = excluded.default_locale,
  locales = excluded.locales,
  active = excluded.active,
  config = excluded.config,
  updated_at = now();

-- Bootstrap super_admin when ADMIN_BOOTSTRAP_IDENTIFIER matches an auth user.
-- Set via env: ADMIN_BOOTSTRAP_IDENTIFIER=+923001234567 or admin@example.com
do $$
declare
  bootstrap_id text := current_setting('app.admin_bootstrap_identifier', true);
  target_id uuid;
begin
  if bootstrap_id is null or bootstrap_id = '' then
    return;
  end if;

  select id into target_id
  from auth.users
  where phone = bootstrap_id or email = bootstrap_id
  limit 1;

  if target_id is null then
    return;
  end if;

  insert into public.user_roles (account_id, role, granted_by)
  values (target_id, 'super_admin', null)
  on conflict (account_id, role) do nothing;

  insert into public.account_status (account_id, status)
  values (target_id, 'active')
  on conflict (account_id) do nothing;
end $$;

-- breeds (M1): priority Pakistan breeds per species. Source of truth for these
-- values is @mating/shared (config/breeds BREED_DEFINITIONS); keep in sync.
-- Inserted after regions because each breed references regions(code).
insert into public.breeds (region_code, species, name, description, active)
values
  ('PK', 'cattle', 'Sahiwal', 'Heat-tolerant dairy breed from the Punjab region.', true),
  ('PK', 'cattle', 'Cholistani', 'Hardy dual-purpose breed from the Cholistan desert.', true),
  ('PK', 'cattle', 'Red Sindhi', 'Dairy breed originating in Sindh.', true),
  ('PK', 'cattle', 'Dhanni', 'Draught and dual-purpose breed from the Pothohar plateau.', true),
  ('PK', 'cattle', 'Tharparkar', 'Dual-purpose breed from the Tharparkar district.', true),
  ('PK', 'buffalo', 'Nili-Ravi', 'High-yield dairy buffalo from central Punjab.', true),
  ('PK', 'buffalo', 'Kundi', 'Dairy buffalo native to Sindh.', true),
  ('PK', 'buffalo', 'Azakheli', 'Buffalo breed from the Swat valley.', true),
  ('PK', 'goat', 'Beetal', 'Large dairy and meat goat from the Punjab.', true),
  ('PK', 'goat', 'Teddy', 'Small, prolific meat goat from the Pothohar region.', true),
  ('PK', 'goat', 'Kamori', 'Dairy goat known for its distinctive long ears, from Sindh.', true),
  ('PK', 'goat', 'Nachi', 'Meat goat with a characteristic dancing gait, from the Punjab.', true),
  ('PK', 'sheep', 'Kajli', 'Meat and wool sheep from the Punjab.', true),
  ('PK', 'sheep', 'Lohi', 'Dual-purpose meat and wool sheep from central Punjab.', true),
  ('PK', 'sheep', 'Thalli', 'Meat sheep from the Thal desert region.', true),
  ('PK', 'sheep', 'Balkhi', 'Fat-tailed mountain sheep from Khyber Pakhtunkhwa.', true),
  ('PK', 'dog', 'Bully Kutta', 'Large guardian and working dog from the subcontinent.', true),
  ('PK', 'dog', 'Gull Terr', 'Agile working terrier-type dog bred in the Punjab.', true),
  ('PK', 'dog', 'Gull Dong', 'Powerful guardian dog, a Bully Kutta and Gull Terr cross.', true)
on conflict (species, name, region_code) do update set
  description = excluded.description,
  active = excluded.active,
  updated_at = now();
