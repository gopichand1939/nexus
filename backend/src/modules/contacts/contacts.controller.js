export const createContactsController=service=>({
 list:async(req,res)=>res.json({data:await service.list(req.session.user_id)}),
 add:async(req,res)=>{await service.add(req.session.user_id,req.body);res.status(201).json({data:{saved:true}});},
 remove:async(req,res)=>{await service.remove(req.session.user_id,req.params.id);res.status(204).end();},
 listBlocked:async(req,res)=>res.json({data:await service.listBlocked(req.session.user_id)}),
 block:async(req,res)=>{await service.block(req.session.user_id,req.body);res.status(201).json({data:{blocked:true}});},
 unblock:async(req,res)=>{await service.unblock(req.session.user_id,req.params.id);res.status(204).end();}
});
