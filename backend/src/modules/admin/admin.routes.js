import {Router} from 'express';
import {requireAdmin,requireMfa} from '../../middleware/auth.js';
export function adminRoutes(c,limit) {
 const r=Router();
 r.use(requireAdmin);
 r.post('/unlock',limit,c.unlock);
 r.use(requireMfa);
 r.get('/dashboard',c.dashboard);
 r.get('/users',c.users);
 r.patch('/users/:id/status',c.status);
 r.get('/audit',c.logs);
 r.get('/reports',c.reports);
 r.patch('/reports/:id',c.resolve);
 r.get('/health',c.health);
 r.get('/storage',c.storage);
 r.post('/storage/purge',c.purge);
 return r;
}
