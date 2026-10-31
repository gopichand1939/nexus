import {Router} from 'express';
export function contactsRoutes(c) {
 const r=Router();
 r.get('/',c.list);
 r.post('/',c.add);
 r.delete('/:id',c.remove);
 r.get('/blocked',c.listBlocked);
 r.post('/block',c.block);
 r.delete('/block/:id',c.unblock);
 return r;
}
