export function createAuthController(service, config) {
  const cookieOptions = {httpOnly:true,secure:config.production,sameSite:'strict',path:'/api'};
  const finish = (res,result,status=200) => {
    res.cookie('nexus_session',result.token,{...cookieOptions,expires:result.expiresAt});
    res.cookie('nexus_csrf',result.csrf,{secure:config.production,sameSite:'strict',path:'/',expires:result.expiresAt});
    res.status(status).json({data:result.data});
  };
  return {
    requestEmail: async(req,res)=>res.status(202).json({data:await service.requestEmail(req.body)}),
    resetPassword: async(req,res)=>res.json({data:await service.resetPassword(req.body)}),
    register: async(req,res)=>finish(res,await service.register(req.body),201),
    login: async(req,res)=>finish(res,await service.login(req.body)),
    me: async(req,res)=>res.json({data:service.describe(req.session)}),
    logout: async(req,res)=>{ await service.logout(req.session); res.clearCookie('nexus_session',cookieOptions);res.clearCookie('nexus_csrf',{path:'/'});res.status(204).end(); }
  };
}
