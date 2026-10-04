import { z } from 'zod';
import catalogue from '../../../shared/data/catalogue.json' with { type: 'json' };
import { applyOperation, emptyState } from '../../../shared/src/store';
import type { AccountState, User, OperationResult } from '../../../shared/src/types';
import { ApiError } from './apiError';

export const STORAGE_KEY = 'beauty-shop-public-preview-v1';
export const PUBLIC_PRODUCT_FIELDS = ['id','name','brand','ean','category','subcategory','size','shadeFragment','historicalMrp','sourceRow'] as const;
// Explicit allowlist: no supplier record, cost, margin, stock or account data can enter this catalogue.
export const publicProducts = catalogue.map(row => Object.fromEntries(PUBLIC_PRODUCT_FIELDS.map(key => [key,row[key]])));
const demoUser: User = { id: 'browser-demo-visitor', email: 'Fictional browser identity', displayName: 'Demo Visitor', role: 'customer' };
const text = z.string();
const address = z.object({id:text,label:text,recipient:text,line:text,city:text,region:text,pincode:text,isDefault:z.boolean()});
const status = z.enum(['created','packed','dispatched','delivered','cancelled']);
const stateSchema = z.object({
  cart:z.record(z.number().int().min(1).max(99)),wishlist:z.array(text),recent:z.array(text),profile:z.object({nickname:text}),addresses:z.array(address),
  orders:z.array(z.object({id:text,requestKey:text,createdAt:text,currency:z.literal('INR'),referenceYear:z.union([z.literal(2022),z.null()]),lines:z.array(z.object({id:text,name:text,ean:text,quantity:z.number(),unitMinor:z.number(),priceBasis:z.enum(['historical','current']).optional()})),subtotalMinor:z.number(),discountMinor:z.number(),exampleMerchandiseMinor:z.number(),coupon:text,method:z.enum(['delivery','pickup']),address:address.nullable(),status,events:z.array(z.object({status,at:text})),returnDraft:z.object({reason:text,createdAt:text,status:z.literal('draft-not-submitted')}).nullable()})),
  drafts:z.array(z.object({id:text,kind:z.enum(['support','business']),subject:text,message:text,createdAt:text,updatedAt:text.optional(),status:z.literal('not-submitted')}))
});
const recordSchema=z.object({version:z.literal(1),active:z.boolean(),revision:z.number().int().nonnegative(),state:stateSchema,receipts:z.array(z.object({id:text,payload:text,result:z.object({orderId:text.optional()})}))});
type RecordData = z.infer<typeof recordSchema>;
export interface DemoStorage { getItem(key:string):string|null; setItem(key:string,value:string):void }
export function createDemoService(storage: DemoStorage) {
  function load(): RecordData {
    let raw: string|null;
    try {raw=storage.getItem(STORAGE_KEY);} catch {throw new ApiError('Browser storage is unavailable. Allow site storage or use a regular browser window to save this demo.',400);}
    if(!raw) return {version:1,active:false,revision:0,state:emptyState(),receipts:[]};
    try {return recordSchema.parse(JSON.parse(raw));} catch {throw new ApiError('Saved demo data cannot be read. Clear this site’s browser data to reset it. Nothing has been overwritten.',400);}
  }
  function save(record:RecordData) {
    const serialized=JSON.stringify(record);
    if(serialized.length>1900000) throw new ApiError('This browser demo is full. Remove some drafts or clear this site’s data to reset it.',400);
    try { storage.setItem(STORAGE_KEY,serialized); } catch {throw new ApiError('The browser could not save this change. Allow site storage or free browser space, then try again.',400);}
  }
  return (path:string,options:RequestInit={}):unknown => {
    if(path==='/api/catalogue' && !options.method) return {products:publicProducts,photos:{}};
    const record=load();
    if(path==='/api/auth/session' && !options.method) return {user:record.active?demoUser:null,csrfToken:record.active?'local-demo':null};
    if(path==='/demo/start' && options.method==='POST') {record.active=true;save(record);return {user:demoUser,csrfToken:'local-demo'};}
    if(path==='/demo/stop' && options.method==='POST') {record.active=false;save(record);return {ok:true};}
    if(path!=='/api/account') throw new ApiError('This feature is not available in the public browser demo.',404);
    if(!record.active) throw new ApiError('Open the demo identity to continue.',401);
    if(!options.method) return {user:demoUser,state:record.state,revision:record.revision,csrfToken:'local-demo'};
    if(options.method!=='POST') throw new ApiError('Unsupported demo action.',405);
    let input:{revision:number;requestId:string;operation?:unknown};
    try {input=z.object({revision:z.number().int().nonnegative(),requestId:text.min(1).max(100),operation:z.unknown()}).strict().parse(JSON.parse(String(options.body)));}
    catch {throw new ApiError('Invalid demo action.',400);}
    const payload=JSON.stringify(input.operation);
    const prior=record.receipts.find(item=>item.id===input.requestId);
    if(prior) {
      if(prior.payload!==payload) throw new ApiError('This save identifier was already used for a different change.',400);
      return {state:record.state,revision:record.revision,result:prior.result};
    }
    if(input.revision!==record.revision) throw new ApiError('The demo changed in another tab. Reload saved data and retry.',409);
    let changed:{state:AccountState;result:OperationResult};
    try {changed=applyOperation(record.state,input.operation);} catch(error) {throw new ApiError(error instanceof Error?error.message:'Invalid demo action.',400);}
    record.state=changed.state;record.revision++;
    record.receipts.push({id:input.requestId,payload,result:changed.result});
    save(record);
    return {state:record.state,revision:record.revision,result:changed.result};
  };
}
