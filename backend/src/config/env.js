const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Run python3 scripts/setup.py first.`);
  return value;
};
export function loadConfig() {
  const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  let originUrl = origin;
  try {
    const parsed = new URL(origin);
    originUrl = parsed.origin;
  } catch {
    originUrl = origin;
  }
  const production = process.env.NODE_ENV === 'production';
  if (production && originUrl.startsWith('http://') && !originUrl.includes('localhost') && originUrl !== '*') {
    originUrl = originUrl.replace('http://', 'https://');
  }
  const key = required('TOKEN_ENCRYPTION_KEY');
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte hex key');
  return Object.freeze({
    production, origin: originUrl, port: Number(process.env.PORT || 3000),
    databaseUrl: required('DATABASE_URL'), dbCa: process.env.DB_CA_FILE,
    matrixUrl: (process.env.MATRIX_INTERNAL_URL || 'http://localhost:3000').replace(/\/$/, ''),
    matrixServer: process.env.MATRIX_SERVER_NAME || 'localhost', matrixPublicUrl: !production ? 'http://127.0.0.1:5173' : originUrl,
    registrationSecret: process.env.MATRIX_REGISTRATION_SECRET || 'dev_secret',
    registrationOpen: process.env.REGISTRATION_OPEN === 'true',
    emailEnabled: process.env.EMAIL_ENABLED === 'true',
    adminUser: process.env.ADMIN_USERNAME || 'owner', adminTotp: process.env.ADMIN_TOTP_SECRET || 'QCDPK2ZZHIXN3I65JWKQOQJLYI2XBTO3',
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
    serviceUser: process.env.MATRIX_SERVICE_USERNAME || 'nexus_service', servicePassword: process.env.MATRIX_SERVICE_PASSWORD || 'secret',
    key, sessionDays: 7, trustProxy: Number(process.env.TRUST_PROXY || 0)
  });
}
