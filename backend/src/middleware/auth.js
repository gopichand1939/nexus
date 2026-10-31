import { assert } from '../shared/errors.js';
import { hashToken, safeEqual } from '../shared/security.js';
export function authentication(service) {
  return async(req,res,next)=>{
    req.session = await service.authenticate(req.cookies.nexus_session);
    if (!['GET','HEAD','OPTIONS'].includes(req.method))
      assert(safeEqual(hashToken(req.get('X-CSRF-Token') || ''),req.session.csrf_hash),403,'CSRF','Refresh the page and try again.');
    next();
  };
}
export function sameOrigin(origin) {
  return (req,res,next)=>{
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const o = req.get('Origin');
      const valid = !origin || origin === '*' || o === origin || process.env.CORS_ALLOW_ALL === 'true' || (!origin.startsWith('https://') && Boolean(o));
      assert(valid,403,'ORIGIN','Request origin rejected.');
    }
    next();
  };
}
export function requireAdmin(req,res,next) {
  assert(req.session?.role==='ADMIN',403,'FORBIDDEN','Administrator access required.'); next();
}
export function requireMfa(req,res,next) {
  assert(req.session?.mfa_until && new Date(req.session.mfa_until)>new Date(),403,'MFA_REQUIRED','Unlock administration with your authenticator code.'); next();
}
