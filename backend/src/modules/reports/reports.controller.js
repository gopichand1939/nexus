export const createReportsController=service=>({create:async(req,res)=>res.status(201).json({data:await service.create(req.session.user_id,req.body)})});
