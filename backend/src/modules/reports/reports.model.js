import {randomUUID} from 'node:crypto';
export function createReportsModel(pool) {return {
 async create(input) {const id=randomUUID();await pool.query('INSERT INTO nexus_reports(id,reporter_id,reported_id,category,evidence) VALUES($1,$2,$3,$4,$5)',[id,input.reporter,input.target,input.category,input.evidence]);return {id,status:'OPEN'};}
};}
