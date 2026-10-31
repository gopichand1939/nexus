import {Router} from 'express';
export function reportsRoutes(c) {const r=Router();r.post('/',c.create);return r;}
