export const createCallsController=service=>({
 log:async(req,res)=>res.status(201).json({data:await service.log(req.session.user_id,req.body)}),
 list:async(req,res)=>res.json({data:await service.list(req.session.user_id,req.query.limit)}),
 clear:async(req,res)=>{await service.clear(req.session.user_id);res.status(204).end();}
});
