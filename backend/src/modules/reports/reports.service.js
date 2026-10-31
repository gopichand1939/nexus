import {assert} from '../../shared/errors.js';
import {text,matrixId} from '../../shared/validation.js';
export function createReportsService(model,config) {return {
 async create(reporter,input) {
  assert(input.consent===true,400,'CONSENT_REQUIRED','Confirm that the selected evidence will be visible to administrators.');
  const target=matrixId(input.userId,config.matrixServer);
  assert(target!==reporter,400,'INVALID_REPORT','You cannot report yourself.');
  return model.create({reporter,target,category:text(input.category,'Category',3,60),evidence:text(input.evidence,'Evidence',1,10000)});
 }
};}
