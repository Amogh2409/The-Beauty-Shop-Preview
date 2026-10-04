import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoService, STORAGE_KEY, publicProducts, PUBLIC_PRODUCT_FIELDS } from '../client/src/lib/demoStorage.js';
import { ApiError } from '../client/src/lib/apiError.js';
import type { AccountResponse, MutationResponse } from '../shared/src/types.js';
import { readFileSync } from 'node:fs';
const id='H2022-ME-R0206';
function fixture(){
  const data=new Map<string,string>();
  const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const service=createDemoService(storage);
  let sequence=0;
  const start=()=>service('/demo/start',{method:'POST'});
  const account=()=>service('/api/account') as AccountResponse;
  const mutate=(operation:unknown,requestId=`r${++sequence}`)=>service('/api/account',{method:'POST',body:JSON.stringify({revision:account().revision,requestId,operation})}) as MutationResponse;
  return {data,storage,service,start,account,mutate};
}
test('public catalogue is explicitly allowlisted and never includes commercial or identity fields',()=>{
 assert.equal(publicProducts.length,277);
 for(const product of publicProducts) assert.deepEqual(Object.keys(product),[...PUBLIC_PRODUCT_FIELDS]);
 assert(!/cost|margin|supplier|password|email/i.test(JSON.stringify(publicProducts)));
});
test('demo identity needs no credentials and logout preserves browser records',()=>{
 const f=fixture();assert.deepEqual(f.service('/api/auth/session'),{user:null,csrfToken:null});
 assert.throws(()=>f.account(),(e:unknown)=>e instanceof ApiError&&e.status===401);
 f.start();assert.equal(f.account().user.role,'customer');f.mutate({type:'cartAdd',id,quantity:2});
 f.service('/demo/stop',{method:'POST'});assert.throws(()=>f.account());
 const reload=createDemoService(f.storage);reload('/demo/start',{method:'POST'});
 assert.equal((reload('/api/account') as AccountResponse).state.cart[id],2);
 assert.throws(()=>f.service('/api/auth/register',{method:'POST',body:'{"password":"must-not-be-saved"}'}));
 assert(!f.data.get(STORAGE_KEY)!.includes('password'));
});
test('wishlist, cart adjustment, save later, removal and empty state persist',()=>{
 const f=fixture();f.start();f.mutate({type:'wishToggle',id});f.mutate({type:'cartAdd',id,quantity:1});f.mutate({type:'cartAdjust',id,delta:1});assert.equal(f.account().state.cart[id],2);
 f.mutate({type:'saveLater',id});assert.deepEqual(f.account().state.cart,{});assert.deepEqual(f.account().state.wishlist,[id]);
 f.mutate({type:'wishToggle',id});f.mutate({type:'cartAdd',id,quantity:1});f.mutate({type:'cartSet',id,quantity:0});assert.deepEqual(f.account().state.cart,{});assert.deepEqual(f.account().state.wishlist,[]);
});
test('pickup checkout, coupon, tracking, return draft and reload work end to end',()=>{
 const f=fixture();f.start();f.mutate({type:'cartAdd',id,quantity:2});
 assert.throws(()=>f.mutate({type:'demoOrderCreate',requestKey:'order-1',acknowledged:false,method:'pickup'}));
 const orderId=f.mutate({type:'demoOrderCreate',requestKey:'order-1',acknowledged:true,method:'pickup',coupon:'DEMO10'}).result.orderId!;
 assert.deepEqual(f.account().state.cart,{});assert.equal(f.account().state.orders[0].exampleMerchandiseMinor,44820);
 for(const expectedStatus of ['created','packed','dispatched'])f.mutate({type:'demoOrderAdvance',id:orderId,expectedStatus});
 f.mutate({type:'demoReturnDraft',id:orderId,reason:'Fictional return draft'});
 const restored=createDemoService(f.storage)('/api/account') as AccountResponse;
 assert.equal(restored.state.orders[0].status,'delivered');assert.equal(restored.state.orders[0].returnDraft?.reason,'Fictional return draft');
});
test('sample delivery, cancellation, profile and unsubmitted drafts remain local',()=>{
 const f=fixture();f.start();f.mutate({type:'profileSave',nickname:'Example'});f.mutate({type:'addressSave',address:{label:'Example',recipient:'Demo Visitor',line:'123 Example Lane',city:'Jhansi',region:'UP',pincode:'284001'}});
 f.mutate({type:'cartAdd',id,quantity:1});const orderId=f.mutate({type:'demoOrderCreate',requestKey:'delivery',acknowledged:true,method:'delivery',addressId:f.account().state.addresses[0].id}).result.orderId!;
 f.mutate({type:'demoOrderCancel',id:orderId});assert.equal(f.account().state.orders[0].status,'cancelled');
 f.mutate({type:'draftSave',kind:'support',subject:'Example',message:'Fictional draft'});const draft=f.account().state.drafts[0];assert.equal(draft.status,'not-submitted');
 f.mutate({type:'draftUpdate',id:draft.id,subject:'Edited example',message:'Updated draft'});assert.equal(f.account().state.drafts[0].subject,'Edited example');f.mutate({type:'draftDelete',id:draft.id});assert.equal(f.account().state.drafts.length,0);
});
test('retries are idempotent; stale tab writes and reused identifiers cannot overwrite',()=>{
 const f=fixture();f.start();const input={revision:0,requestId:'stable',operation:{type:'cartAdd',id,quantity:1}};const options={method:'POST',body:JSON.stringify(input)};
 f.service('/api/account',options);f.service('/api/account',options);assert.equal(f.account().state.cart[id],1);
 assert.throws(()=>f.service('/api/account',{method:'POST',body:JSON.stringify({...input,requestId:'other'})}),(e:unknown)=>e instanceof ApiError&&e.status===409);
 assert.throws(()=>f.service('/api/account',{method:'POST',body:JSON.stringify({...input,operation:{type:'cartAdd',id,quantity:2}})}));assert.equal(f.account().state.cart[id],1);
});
test('unavailable storage and corruption fail honestly without overwriting records',()=>{
 const broken=createDemoService({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
 assert.throws(()=>broken('/demo/start',{method:'POST'}),/storage is unavailable/);
 const f=fixture();f.data.set(STORAGE_KEY,'{"broken":');assert.throws(()=>f.start(),/Nothing has been overwritten/);assert.equal(f.data.get(STORAGE_KEY),'{"broken":');
});
test('quota failure never reports a saved change or mutates the prior snapshot',()=>{
 const f=fixture();f.start();const before=f.data.get(STORAGE_KEY);const failing=createDemoService({getItem:f.storage.getItem,setItem:()=>{throw Error('quota');}});
 assert.throws(()=>failing('/api/account',{method:'POST',body:JSON.stringify({revision:0,requestId:'quota',operation:{type:'cartAdd',id,quantity:1}})}),/could not save/);assert.equal(f.data.get(STORAGE_KEY),before);
});
test('public adapter has no network calls or credential fields and assets use the Pages base',()=>{
 const api=readFileSync('client/src/lib/api.ts','utf8');assert(!/fetch\s*\(/.test(api));
 const gate=readFileSync('client/src/components/AccountGate.tsx','utf8');assert(!/type="(?:email|password)"|name="(?:email|password)"/.test(gate));
 const app=readFileSync('client/src/App.tsx','utf8');assert(!app.includes('AdminPage'));
 const home=readFileSync('client/src/pages/HomePage.tsx','utf8');assert(!/="\/assets\//.test(home));assert(home.includes('import.meta.env.BASE_URL'));
});
