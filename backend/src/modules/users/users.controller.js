export const createUsersController=service=>({
  remove:async(req,res)=>{await service.remove(req.session,req.body);res.clearCookie('nexus_session',{path:'/api'});res.clearCookie('nexus_csrf',{path:'/'});res.status(204).end();},
  search:async(req,res)=>res.json({data:await service.search(req.query.username||req.query.q||req.query.id,req.session?.user_id)}),
  searchAll:async(req,res)=>res.json({data:await service.searchAll(req.query.q||req.query.username||req.query.id,req.session?.user_id)}),
  update:async(req,res)=>res.json({data:await service.update(req.session,req.body)}),
  savePush:async(req,res)=>res.status(201).json({data:await service.savePush(req.session,req.body)}),
  removePush:async(req,res)=>{await service.removePush(req.session,req.body?.endpoint);res.status(204).end();}
});
