import {Router} from 'express';
export function callsRoutes(c) {
 const r=Router();
 r.get('/',c.list);
 r.post('/',c.log);
 r.delete('/',c.clear);
 return r;
}
