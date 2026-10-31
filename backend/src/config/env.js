const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Run python3 scripts/setup.py first.`);
  return value;
};
export function loadConfig() {
  const origin = required('APP_ORIGIN');
  const parsed = new URL(origin);
  const production = process.env.NODE_ENV === 'production';
  if (production && parsed.protocol !== 'https:') throw new Error('Production APP_ORIGIN requires HTTPS');
  const key = required('TOKEN_ENCRYPTION_KEY');
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte hex key');
  return Object.freeze({
    production, origin: parsed.origin, port: Number(process.env.PORT || 3000),
    databaseUrl: required('DATABASE_URL'), dbCa: process.env.DB_CA_FILE,
    matrixUrl: required('MATRIX_INTERNAL_URL').replace(/\/$/, ''),
    matrixServer: required('MATRIX_SERVER_NAME'), matrixPublicUrl: !production ? 'http://127.0.0.1:5173' : parsed.origin,
    registrationSecret: required('MATRIX_REGISTRATION_SECRET'),
    registrationOpen: process.env.REGISTRATION_OPEN === 'true',
    emailEnabled: process.env.EMAIL_ENABLED === 'true',
    adminUser: required('ADMIN_USERNAME'), adminTotp: required('ADMIN_TOTP_SECRET'),
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
    serviceUser: required('MATRIX_SERVICE_USERNAME'), servicePassword: required('MATRIX_SERVICE_PASSWORD'),
    key, sessionDays: 7, trustProxy: Number(process.env.TRUST_PROXY || 0)
  });
}
