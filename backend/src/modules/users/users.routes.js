import {Router} from 'express';
export function usersRoutes(controller) {
  const router=Router();
  router.get('/search',controller.search);
  router.get('/search-all',controller.searchAll);
  router.patch('/me',controller.update);
  router.delete('/me',controller.remove);
  router.post('/me/push',controller.savePush);
  router.delete('/me/push',controller.removePush);
  return router;
}
