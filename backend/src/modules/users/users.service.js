import { username,text } from '../../shared/validation.js';
import { assert } from '../../shared/errors.js';
import { publicSelf } from '../auth/auth.service.js';
export function createUsersService({model,contactsModel,matrix,vault}) {
  return {
    async remove(session,input){await matrix.deactivate(session.user_id,text(input.password,'Password',1,128),vault.open(session.matrix_token));await model.remove(session.user_id);},
    async search(value,requesterId) {
      assert(value&&typeof value==='string'&&value.trim().length>0,400,'INVALID_INPUT','Search query required.');
      const result=await model.search(value.trim());
      assert(result,404,'NOT_FOUND','No discoverable account found.');
      if(requesterId&&contactsModel){
        const blocked=await contactsModel.isBlocked(requesterId,result.id);
        assert(!blocked,404,'NOT_FOUND','No discoverable account found.');
        const contactPolicy=result.preferences?.contactPolicy;
        if(contactPolicy==='contacts_only'&&requesterId!==result.id){
          const isContact=await contactsModel.hasContact(result.id,requesterId);
          assert(isContact,403,'CONTACTS_ONLY','This user only accepts conversations from saved contacts.');
        }
      }
      return {id:result.id,username:result.username,displayName:result.display_name};
    },
    async searchAll(value,requesterId) {
      if(!value||typeof value!=='string'||!value.trim())return [];
      const results=await model.searchAll(value.trim(),10);
      const output=[];
      for(const r of results){
        if(requesterId&&contactsModel){
          const blocked=await contactsModel.isBlocked(requesterId,r.id);
          if(blocked)continue;
        }
        output.push({id:r.id,username:r.username,displayName:r.display_name});
      }
      return output;
    },
    async update(session,input) {
      const displayName=text(input.displayName,'Display name',1,80).trim();
      assert(displayName.length>0,400,'INVALID_INPUT','Display name cannot be empty.');
      const current=(await model.getById?.(session.user_id))?.preferences||{};
      const preferences={
        ...current,
        readReceipts:input.preferences?.readReceipts!==false,
        presence:input.preferences?.presence===true||input.preferences?.presence==='all',
        presencePolicy:['all','contacts_only','off'].includes(input.preferences?.presencePolicy)?input.preferences.presencePolicy:(input.preferences?.presence?'all':'off'),
        contactPolicy:input.preferences?.contactPolicy==='contacts_only'?'contacts_only':'anyone'
      };
      await matrix.setDisplayName(session.user_id,displayName,vault.open(session.matrix_token));
      return publicSelf(await model.update(session.user_id,displayName,preferences));
    },
    async savePush(session,input) {
      assert(input?.endpoint,400,'INVALID_INPUT','Missing push endpoint.');
      assert(input?.p256dh&&input?.auth,400,'INVALID_INPUT','Missing push keys.');
      await model.savePushSubscription(session.user_id,input);
      return {saved:true};
    },
    async removePush(session,endpoint) {
      assert(endpoint,400,'INVALID_INPUT','Missing push endpoint.');
      await model.deletePushSubscription(session.user_id,endpoint);
      return {removed:true};
    }
  };
}
