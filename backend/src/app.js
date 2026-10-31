import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {rateLimit} from 'express-rate-limit';
import {randomUUID} from 'node:crypto';
import {createTokenVault} from './shared/security.js';
import {authentication,sameOrigin} from './middleware/auth.js';
import {createAuthModel} from './modules/auth/auth.model.js';
import {createAuthService} from './modules/auth/auth.service.js';
import {createAuthController} from './modules/auth/auth.controller.js';
import {authRoutes} from './modules/auth/auth.routes.js';
import {createUsersModel} from './modules/users/users.model.js';
import {createUsersService} from './modules/users/users.service.js';
import {createUsersController} from './modules/users/users.controller.js';
import {usersRoutes} from './modules/users/users.routes.js';
import {createContactsModel} from './modules/contacts/contacts.model.js';
import {createContactsService} from './modules/contacts/contacts.service.js';
import {createContactsController} from './modules/contacts/contacts.controller.js';
import {contactsRoutes} from './modules/contacts/contacts.routes.js';
import {createReportsModel} from './modules/reports/reports.model.js';
import {createReportsService} from './modules/reports/reports.service.js';
import {createReportsController} from './modules/reports/reports.controller.js';
import {reportsRoutes} from './modules/reports/reports.routes.js';
import {createAdminModel} from './modules/admin/admin.model.js';
import {createAdminService} from './modules/admin/admin.service.js';
import {createAdminController} from './modules/admin/admin.controller.js';
import {adminRoutes} from './modules/admin/admin.routes.js';
import {createCallsModel} from './modules/calls/calls.model.js';
import {createCallsService} from './modules/calls/calls.service.js';
import {createCallsController} from './modules/calls/calls.controller.js';
import {callsRoutes} from './modules/calls/calls.routes.js';
import {createMockMatrixRouter} from './providers/matrix.mock.js';
export function createApp({config,pool,matrix}) {
 const app=express();app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);
 app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'},crossOriginOpenerPolicy:{policy:'unsafe-none'}}));
 app.use((req,res,next)=>{
  const origin=req.get('Origin');
  if(origin){
   res.setHeader('Access-Control-Allow-Origin',origin);
   res.setHeader('Access-Control-Allow-Credentials','true');
  }else{
   res.setHeader('Access-Control-Allow-Origin','*');
  }
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Request-Id, *');
  res.setHeader('Access-Control-Expose-Headers','X-CSRF-Token, X-Request-Id');
  if(req.method==='OPTIONS')return res.sendStatus(204);
  next();
 });
 app.use(express.json({limit:'32kb'}));app.use(cookieParser());
 app.use((req,res,next)=>{req.requestId=randomUUID();res.set('Cache-Control','no-store');res.set('X-Request-Id',req.requestId);next();});
 app.use('/api',sameOrigin(config.origin));
 app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false}));
 const sensitiveLimit=rateLimit({windowMs:15*60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false});
 const vault=createTokenVault(config.key);
 const auth=createAuthService({model:createAuthModel(pool),matrix,vault,config});
 const authenticate=authentication(auth);
 const contactsModel=createContactsModel(pool);
 app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({data:{status:'ready'}});}catch{res.status(503).json({error:{code:'NOT_READY',message:'Service is starting.'}});}});
 app.get('/api/config',(req,res)=>res.json({data:{registrationOpen:config.registrationOpen,emailEnabled:config.emailEnabled,serverName:config.matrixServer,adminUser:config.adminUser,adminPassword:config.adminPassword||'Admin@123'}}));
 app.use("/_matrix/client", createMockMatrixRouter(config));
 app.use('/api/auth',authRoutes(createAuthController(auth,config),authenticate,sensitiveLimit));
 app.use('/api/users',authenticate,usersRoutes(createUsersController(createUsersService({model:createUsersModel(pool),contactsModel,matrix,vault}))));
 app.use('/api/contacts',authenticate,contactsRoutes(createContactsController(createContactsService(contactsModel,config))));
 app.use('/api/calls',authenticate,callsRoutes(createCallsController(createCallsService(createCallsModel(pool)))));
 app.use('/api/reports',authenticate,sensitiveLimit,reportsRoutes(createReportsController(createReportsService(createReportsModel(pool),config))));
 app.use('/api/admin',authenticate,adminRoutes(createAdminController(createAdminService({model:createAdminModel(pool),matrix,config})),sensitiveLimit));
 app.use((req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Route not found.'}}));
 app.use((error,req,res,next)=>{
  if(res.headersSent)return next(error);
  let status=error.status||500,code=error.code||'INTERNAL_ERROR',message=error.message;
  if(error.code==='23503'){status=404;code='NOT_FOUND';message='Account not found.';}
  if(error.code==='23505'){status=409;code='CONFLICT';message='This record already exists.';}
  if(status>=500){console.error(JSON.stringify({requestId:req.requestId,code:'INTERNAL_ERROR'}));message='Service unavailable. Please try again.';code='INTERNAL_ERROR';}
  res.status(status).json({error:{code,message,requestId:req.requestId}});
 });
 return app;
}
