import { Router } from 'express';
export function authRoutes(controller, authenticate, loginLimit) {
  const router=Router();
  router.post('/email/request',loginLimit,controller.requestEmail);
  router.post('/password/reset',loginLimit,controller.resetPassword);
  router.post('/register',loginLimit,controller.register);
  router.post('/login',loginLimit,controller.login);
  router.get('/me',authenticate,controller.me);
  router.post('/logout',authenticate,controller.logout);
  return router;
}
