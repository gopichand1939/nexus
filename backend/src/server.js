import {loadConfig} from './config/env.js';
import {createPool} from './database/pool.js';
import {createMatrixProvider} from './providers/matrix.provider.js';
import {createApp} from './app.js';
const config=loadConfig(),pool=createPool(config),matrix=createMatrixProvider(config);
const app=createApp({config,pool,matrix});
const server=app.listen(config.port,()=>console.log(`NEXUS API listening on ${config.port}`));
const cleanup=setInterval(async()=>{
 try {
  await pool.query('DELETE FROM nexus_sessions WHERE expires_at<now()');
  await pool.query("DELETE FROM nexus_call_logs WHERE created_at < now() - interval '90 days'");
 } catch(e) {
  console.error('Background retention cleanup failed:',e.message);
 }
},3600000);
cleanup.unref();
let closing=false;
async function stop(){if(closing)return;closing=true;clearInterval(cleanup);server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
