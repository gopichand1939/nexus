import {useEffect,useRef} from 'react';
import {X,LoaderCircle,ShieldCheck} from 'lucide-react';
export function Brand(){return <div className="brand"><span className="brand-mark">N</span><span>NEXUS<small>YOUR PRIVATE SPACE</small></span></div>;}
export function Avatar({name='',size=''}){return <span className={`avatar ${size}`}>{name.replace('@','').slice(0,2).toUpperCase()}</span>;}
export function IconButton({label,children,...props}){return <button className="icon-button" title={label} aria-label={label} {...props}>{children}</button>;}
export function Spinner(){return <LoaderCircle className="spin" size={20}/>;}
export function Empty({title,children}){return <div className="empty"><span className="empty-icon"><ShieldCheck size={36}/></span><h2>{title}</h2><div className="empty-copy">{children}</div></div>;}
export function Modal({title,onClose,children,wide=false}) {
 const ref=useRef(null);
 useEffect(()=>{const dialog=ref.current;dialog.showModal();const cancel=e=>{e.preventDefault();onClose();};dialog.addEventListener('cancel',cancel);return()=>{dialog.removeEventListener('cancel',cancel);dialog.close();};},[]);
 return <dialog ref={ref} className={wide?'modal wide':'modal'} aria-label={title}><div className="modal-head"><h2>{title}</h2><IconButton label="Close" onClick={onClose}><X size={20}/></IconButton></div><div className="modal-body">{children}</div></dialog>;
}
