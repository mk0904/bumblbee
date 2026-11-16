import { missionTemplates } from '../shared/mission-templates.js';
const base=process.env.BACKEND_URL ?? 'http://127.0.0.1:3000';
let cookie='',csrf='';
async function request(path,body,headers={}) {
 const response=await fetch(`${base}/api${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:'http://127.0.0.1:5174','Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const value=response.status===204 ? null : await response.json();
 if(!response.ok) throw new Error(`Request failed: ${response.status}`);
 if(response.headers.get('set-cookie')) cookie=response.headers.get('set-cookie').split(';')[0];
 if(value?.csrf) csrf=value.csrf;
 return value;
}
const pairing=await request('/pairing/request',{}, {Authorization:`Bearer ${process.env.SIMULATOR_TOKEN}`});
await request('/pairing/claim',{code:pairing.code});
const dashboard=await request('/dashboard');
for(const template of missionTemplates) {
 if(dashboard.missions.some(m=>m.name===template.name)) {console.log(`Already exists: ${template.name}`);continue;}
 await request('/missions',template);
 console.log(`Created: ${template.name}`);
}
await request('/auth/logout',{});
