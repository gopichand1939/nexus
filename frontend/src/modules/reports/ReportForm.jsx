import {useState} from 'react';
import {api} from '../../shared/api';
export function ReportForm({userId,initialEvidence='',onDone,notify}) {
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);try{await api('/reports',{method:'POST',body:{...data,userId,consent}});notify('Your report was submitted.');onDone();}catch(e){notify(e.message);}finally{setBusy(false);}}
 return <form className="stack" onSubmit={submit}><p>Reporting <strong>{userId}</strong></p><label>Category<select name="category"><option>Harassment</option><option>Spam</option><option>Threats</option><option>Other concern</option></select></label><label>Evidence and explanation<textarea name="evidence" defaultValue={initialEvidence} required maxLength={10000} rows={7}/></label><label className="check-row"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I understand that administrators will see the text above, my identity, and the reported account. Other private messages are not included.</span></label><button className="primary" disabled={!consent||busy}>Submit report</button></form>;
}
