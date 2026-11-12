import {useRef,useState} from 'react';
import {LIMIT,type Thought} from '../lib/orbit';
import {CommentIcon} from './scene';
export default function Comments({item,readOnly,onSend}:{item:Thought;readOnly:boolean;onSend:(item:Thought,body:string,id:string)=>Promise<void>}){
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const request=useRef('');
 const comments=item.comments||[];
 async function send(e:React.FormEvent){e.preventDefault();if(busy||readOnly||!text.trim())return;setBusy(true);setError('');request.current ||= crypto.randomUUID();try{await onSend(item,text.trim(),request.current);setText('');request.current=''}catch(e){setError(e instanceof Error?e.message:'댓글을 보내지 못했어요. 다시 시도해 주세요.')}finally{setBusy(false)}}
 return <section className="comments" aria-label="익명 댓글"><h2><CommentIcon/>댓글 <span>{comments.length}</span></h2>
 {comments.length?<ol className="comment-list">{comments.map(c=><li key={c.id}><span className="comment-author">익명</span><p>{c.body}</p></li>)}</ol>:<p className="no-comments">아직 댓글이 없어요.</p>}
 {!readOnly&&<form className="comment-form" onSubmit={send}><textarea aria-label="익명 댓글 입력" placeholder="익명으로 댓글 남기기" maxLength={LIMIT} rows={2} value={text} disabled={busy} onChange={e=>{setText(e.target.value);request.current=''}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="submit" disabled={busy||!text.trim()}>{busy?'전송 중':'등록'}</button></form>}
 {error&&<p className="comment-error" role="alert">{error}</p>}</section>;
}
