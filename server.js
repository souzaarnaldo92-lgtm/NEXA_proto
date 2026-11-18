'use strict';
// NEXA — gateway de teste (Node 18+, sem dependências).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||3000,DATA=path.join(__dirname,'data'),PUB=path.join(__dirname,'public');
const RETENTION_DAYS=+process.env.RETENTION_DAYS||30,MODE=process.env.INTEGRATION_MODE||'sandbox';
fs.mkdirSync(DATA,{recursive:true});
const OP=path.join(DATA,'operational.json'),AN=path.join(DATA,'analytic.json'),
      SV=path.join(DATA,'services.json'),RF=path.join(DATA,'referrals.json'),US=path.join(DATA,'users.json');
const load=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return[]}};
let ops=load(OP).filter(o=>o.ts>Date.now()-RETENTION_DAYS*864e5),an=load(AN),
    services=load(SV),referrals=load(RF),users=load(US);
const sessions=new Map(), ROLES=['administrador','coordenação','profissional','consulta'];
const hashPassword=(password,salt=crypto.randomBytes(16).toString('hex'))=>({salt,hash:crypto.scryptSync(password,salt,64).toString('hex')});
const verifyPassword=(password,u)=>{try{return crypto.timingSafeEqual(Buffer.from(hashPassword(password,u.salt).hash,'hex'),Buffer.from(u.hash,'hex'))}catch{return false}};
if(!users.length){const password=process.env.NEXA_ADMIN_PASSWORD||crypto.randomBytes(9).toString('base64url');const h=hashPassword(password);users.push({id:'USR-ADMIN',name:'Administrador do sistema',username:'admin',role:'administrador',active:true,...h,createdAt:Date.now()});if(process.env.NEXA_ADMIN_PASSWORD)console.log('Conta inicial admin criada. A senha foi definida nas variáveis de ambiente.');else console.log('ACESSO INICIAL NEXA — usuário: admin | senha: '+password+' | altere após entrar.');}
const save=()=>{fs.writeFileSync(OP,JSON.stringify(ops));fs.writeFileSync(AN,JSON.stringify(an));fs.writeFileSync(SV,JSON.stringify(services));fs.writeFileSync(RF,JSON.stringify(referrals));fs.writeFileSync(US,JSON.stringify(users))};save();

// ADAPTADORES: trocar send() pelo cliente real quando houver convênio e especificação técnica.
// "confirmed" só pode ser true se o órgão confirmar o recebimento. Em sandbox é sempre false.
const adapters=[
 {name:'190 / CIODS (PM-PE)',send:async a=>({confirmed:false})},
 {name:'Guarda Municipal',send:async a=>({confirmed:false})}];
const dispatch=a=>Promise.all(adapters.map(async d=>{try{const r=await d.send(a);return{orgao:d.name,modo:MODE,confirmado:MODE!=='sandbox'&&!!r.confirmed}}
 catch{return{orgao:d.name,modo:MODE,confirmado:false,erro:true}}}));

const hits=new Map();
const limited=ip=>{const n=Date.now(),a=(hits.get(ip)||[]).filter(t=>n-t<6e4);a.push(n);hits.set(ip,a);return a.length>20};
const body=req=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e4){no();req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch{no()}})});
const send=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))};
const bearer=req=>(req.headers.authorization||'').replace(/^Bearer /,'');
const currentUser=req=>sessions.get(bearer(req))||null;
const auth=req=>!!currentUser(req);
const can=(req,roles)=>{const u=currentUser(req);return !!u&&roles.includes(u.role)};
const num=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?v:null;
const cellOf=(lat,lng)=>[Math.floor(lat/.01)*.01,Math.floor(lng/.01)*.01].map(x=>+x.toFixed(2));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'};
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";

http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://x'),p=u.pathname,ip=req.socket.remoteAddress;
 try{
 if(p.startsWith('/api/')){
  if(req.method==='POST'&&p==='/api/auth/login'){const b=await body(req),u=users.find(x=>x.username===String(b.username||'').toLowerCase()&&x.active);if(!u||!verifyPassword(String(b.password||''),u))return send(res,401,{erro:'usuário ou senha inválidos'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{id:u.id,name:u.name,username:u.username,role:u.role});return send(res,200,{token,user:{id:u.id,name:u.name,username:u.username,role:u.role}})}
  if(req.method==='POST'&&p==='/api/auth/logout'){sessions.delete(bearer(req));return send(res,200,{ok:true})}
  if(req.method==='GET'&&p==='/api/auth/me'){const u=currentUser(req);return u?send(res,200,u):send(res,401,{erro:'não autenticado'})}
  if(limited(ip))return send(res,429,{erro:'muitas requisições'});
  if(req.method==='POST'&&p==='/api/alert'){
   const b=await body(req),lat=num(b.lat,-90,90),lng=num(b.lng,-180,180),profile=['A','B','C'].includes(b.profile)?b.profile:'A';
   const id='NX-'+crypto.randomBytes(4).toString('hex').toUpperCase().slice(0,6),ts=Date.now();
   const rec={id,ts,lat,lng,acc:num(b.acc,0,1e5),profile,priority:'não avaliada',status:'recebido',place:null,history:[{at:ts,action:'Solicitação recebida',by:'sistema'}],semLocalizacao:lat===null||lng===null};
   rec.dispatch=await dispatch(rec);ops.push(rec);
   // Trilha analítica: sem protocolo, sem coordenada exata, só célula ~1 km e faixa horária.
   if(!rec.semLocalizacao){const d=new Date(ts);an.push({cell:cellOf(lat,lng),band:Math.floor(d.getHours()/6),day:d.toISOString().slice(0,10)})}
   save();return send(res,201,{protocol:id,status:rec.status,mode:MODE,semLocalizacao:rec.semLocalizacao,dispatch:rec.dispatch});}
  let m=p.match(/^\/api\/alert\/(NX-[0-9A-F]{6})(\/place)?$/);
  if(m){const r=ops.find(o=>o.id===m[1]);if(!r)return send(res,404,{erro:'protocolo não encontrado'});
   if(req.method==='GET'&&!m[2])return send(res,200,{status:r.status,dispatch:r.dispatch});
   if(req.method==='PATCH'&&m[2]){const b=await body(req);if(['Via pública','Transporte','Estabelecimento','Residência','Outro'].includes(b.kind)){r.place=b.kind;save()}return send(res,200,{ok:true})}}
  if(req.method==='GET'&&p==='/api/territory'){
   if(!can(req,['administrador','coordenação','consulta']))return send(res,403,{erro:'perfil sem permissão'});
   const k=Math.max(+u.searchParams.get('k')||5,3),g={};
   an.forEach(a=>{const key=a.cell.join(',');g[key]=(g[key]||0)+1});
   const cells=Object.entries(g).filter(([,n])=>n>=k).map(([c,n])=>({lat:+c.split(',')[0],lng:+c.split(',')[1],count:n}));
   return send(res,200,{k,cells,ocultas:Object.keys(g).length-cells.length})}
  if(p.startsWith('/api/console/')){
   if(!auth(req))return send(res,401,{erro:'não autorizado'});
   const role=currentUser(req).role;
   if(p.startsWith('/api/console/users')&&role!=='administrador')return send(res,403,{erro:'somente administradores podem gerir usuários'});
   if((p==='/api/console/services'&&req.method!=='GET'||p.startsWith('/api/console/services/'))&&!['administrador','coordenação'].includes(role))return send(res,403,{erro:'perfil sem permissão'});
   if(p==='/api/console/alerts'||p.startsWith('/api/console/alerts/')||p==='/api/console/referrals'||p.startsWith('/api/console/referrals/'))if(!['administrador','coordenação','profissional'].includes(role))return send(res,403,{erro:'perfil sem permissão'});
   if(req.method==='GET'&&p==='/api/console/users')return send(res,200,users.map(({hash,salt,...u})=>u));
   if(req.method==='POST'&&p==='/api/console/users'){
    const b=await body(req),username=String(b.username||'').trim().toLowerCase(),name=String(b.name||'').trim(),role=String(b.role||'');
    if(!/^[a-z0-9._-]{3,32}$/.test(username)||name.length<3||!ROLES.includes(role)||String(b.password||'').length<10)return send(res,400,{erro:'informe nome, usuário válido, perfil e senha com pelo menos 10 caracteres'});
    if(users.some(x=>x.username===username))return send(res,409,{erro:'nome de usuário já existe'});
    const h=hashPassword(String(b.password));const item={id:'USR-'+crypto.randomBytes(3).toString('hex').toUpperCase(),name,username,role,active:true,...h,createdAt:Date.now()};users.push(item);save();const {hash,salt,...safe}=item;return send(res,201,safe);
   }
   m=p.match(/^\/api\/console\/users\/(USR-[A-F0-9]+)$/);
   if(m&&req.method==='PATCH'){
    const b=await body(req),u=users.find(x=>x.id===m[1]);if(!u)return send(res,404,{erro:'usuário não encontrado'});
    if(typeof b.active==='boolean'){if(u.id==='USR-ADMIN'&&!b.active)return send(res,400,{erro:'não é permitido desativar a conta inicial'});u.active=b.active}
    if(ROLES.includes(b.role))u.role=b.role;if(typeof b.name==='string'&&b.name.trim())u.name=b.name.trim().slice(0,120);
    if(typeof b.password==='string'&&b.password.length>=10){const h=hashPassword(b.password);u.salt=h.salt;u.hash=h.hash}
    save();const {hash,salt,...safe}=u;return send(res,200,safe);
   }
   if(req.method==='GET'&&p==='/api/console/services')return send(res,200,services);
   if(req.method==='POST'&&p==='/api/console/services'){
    const b=await body(req);
    if(!b.name||!b.category||!b.city)return send(res,400,{erro:'nome, categoria e município são obrigatórios'});
    const item={id:'SRV-'+crypto.randomBytes(3).toString('hex').toUpperCase(),name:String(b.name).trim().slice(0,120),category:String(b.category).trim().slice(0,80),city:String(b.city).trim().slice(0,100),address:String(b.address||'').trim().slice(0,180),phone:String(b.phone||'').trim().slice(0,40),hours:String(b.hours||'').trim().slice(0,100),active:b.active!==false,createdAt:Date.now()};
    services.push(item);save();return send(res,201,item);
   }
   if(req.method==='PATCH'&&p.match(/^\/api\/console\/services\/SRV-[A-F0-9]+$/)){
    const id=p.split('/').pop(),b=await body(req),r=services.find(x=>x.id===id);
    if(!r)return send(res,404,{erro:'serviço não encontrado'});
    if(typeof b.active==='boolean')r.active=b.active;
    save();return send(res,200,r);
   }
   if(req.method==='GET'&&p==='/api/console/referrals')return send(res,200,referrals.slice().reverse());
   m=p.match(/^\/api\/console\/referrals\/(ENC-[A-F0-9]+)$/);
   if(m&&req.method==='PATCH'){
    const b=await body(req),r=referrals.find(x=>x.id===m[1]);
    if(!r)return send(res,404,{erro:'encaminhamento não encontrado'});
    const allowed=['registrado','enviado','recebido pelo serviço','em atendimento','atendido','não compareceu','recusado pelo serviço','sem retorno','cancelado'];
    if(b.status!==undefined&&!allowed.includes(b.status))return send(res,400,{erro:'situação do encaminhamento inválida'});
    const before=r.status;
    if(b.status!==undefined&&b.status!==before){r.status=b.status;r.updatedAt=Date.now();r.history||(r.history=[]);r.history.push({at:Date.now(),action:'Situação alterada de '+before+' para '+b.status,by:'operador'});}
    if(typeof b.feedback==='string'&&b.feedback.trim()){
      r.feedback||(r.feedback=[]);r.feedback.push({at:Date.now(),text:b.feedback.trim().slice(0,1000),by:'operador'});
      r.history||(r.history=[]);r.history.push({at:Date.now(),action:'Devolutiva registrada',by:'operador'});
    }
    if(typeof b.pending==='string'&&b.pending.trim()){
      r.pending=b.pending.trim().slice(0,500);r.pendingAt=Date.now();
      r.history||(r.history=[]);r.history.push({at:Date.now(),action:'Pendência atualizada',by:'operador'});
    }
    if(b.clearPending===true){r.pending='';r.pendingAt=Date.now();r.history||(r.history=[]);r.history.push({at:Date.now(),action:'Pendência encerrada',by:'operador'});}
    const op=ops.find(x=>x.id===r.protocol);
    if(op&&['recebido pelo serviço','em atendimento','atendido'].includes(r.status)&&!['concluído','duplicado'].includes(op.status)){
      if(op.status!=='em acompanhamento'){op.status='em acompanhamento';(op.history||(op.history=[])).push({at:Date.now(),action:'Encaminhamento em acompanhamento',by:'sistema'});}
    }
    if(op){(op.history||(op.history=[])).push({at:Date.now(),action:'Acompanhamento do encaminhamento atualizado: '+r.status,by:'operador'});}
    save();return send(res,200,r);
   }
   if(req.method==='POST'&&p==='/api/console/referrals'){
    const b=await body(req),op=ops.find(x=>x.id===b.protocol),sv=services.find(x=>x.id===b.serviceId&&x.active);
    if(!op||!sv)return send(res,400,{erro:'solicitação ou serviço ativo não encontrado'});
    const item={id:'ENC-'+crypto.randomBytes(3).toString('hex').toUpperCase(),protocol:op.id,serviceId:sv.id,serviceName:sv.name,kind:String(b.kind||'encaminhamento').slice(0,80),status:'registrado',note:String(b.note||'').trim().slice(0,500),pending:'',feedback:[],history:[{at:Date.now(),action:'Encaminhamento registrado',by:'operador'}],createdAt:Date.now(),createdBy:'operador'};
    referrals.push(item);op.status='encaminhado';(op.history||(op.history=[])).push({at:Date.now(),action:'Encaminhamento registrado para '+sv.name,by:'operador'});save();return send(res,201,item);
   }
   if(req.method==='GET'&&p==='/api/console/alerts')return send(res,200,ops.slice(-100).reverse());
   m=p.match(/^\/api\/console\/alerts\/(NX-[0-9A-F]{6})$/);
   if(m&&req.method==='POST'){const b=await body(req),r=ops.find(o=>o.id===m[1]);
    if(!r)return send(res,404,{erro:'protocolo não encontrado'});
    const allowedStatus=['recebido','em avaliação','em atendimento','encaminhado','em acompanhamento','concluído','duplicado','não foi possível contato'];
    const allowedPriority=['imediata','alta','moderada','programada','não avaliada'];
    if(b.status!==undefined){
      if(!allowedStatus.includes(b.status))return send(res,400,{erro:'situação inválida'});
      if(r.status!==b.status){r.status=b.status;(r.history||(r.history=[])).push({at:Date.now(),action:'Situação alterada para '+b.status,by:'operador'});}
    }
    if(b.priority!==undefined){
      if(!allowedPriority.includes(b.priority))return send(res,400,{erro:'prioridade inválida'});
      if(r.priority!==b.priority){r.priority=b.priority;(r.history||(r.history=[])).push({at:Date.now(),action:'Prioridade definida como '+b.priority,by:'operador'});}
    }
    if(typeof b.note==='string'&&b.note.trim()){
      r.notes||(r.notes=[]);r.notes.push({at:Date.now(),text:b.note.trim().slice(0,1000),by:'operador'});
      (r.history||(r.history=[])).push({at:Date.now(),action:'Providência registrada',by:'operador'});
    }
    save();return send(res,200,{ok:true,record:r})}}
  return send(res,404,{erro:'não encontrado'});}
 // estáticos
 const f=p==='/'?'index.html':p==='/console'?'console.html':p.slice(1),fp=path.join(PUB,path.normalize(f));
 if(!fp.startsWith(PUB)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);return res.end('404')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'text/plain','Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'geolocation=(self)'});
 fs.createReadStream(fp).pipe(res);
 }catch{send(res,400,{erro:'requisição inválida'})}
}).listen(PORT,()=>console.log(`NEXA em http://localhost:${PORT}  (modo ${MODE})\nGestão: http://localhost:${PORT}/console`));
