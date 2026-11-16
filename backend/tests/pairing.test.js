import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/infrastructure/auth.js';
test('permanent code works repeatedly and across service restarts; sessions remain random', () => {
 const auth = new AuthService({simulatorToken:'test-secret'});
 assert.throws(()=>auth.verifyBridge('Bearer wrong'),{code:'INVALID_BRIDGE_CREDENTIAL'});
 const first=auth.requestPairing();
 assert.equal(first.code,'BMBL');
 assert.equal(first.expiresAt,null);
 const a=auth.pair('bmbl'), b=auth.pair('BMBL');
 assert.notEqual(a.token,b.token);
 assert.equal(a.token.length,64);
 assert.ok(new AuthService({simulatorToken:'test-secret'}).pair(first.code).token);
 auth.logout({headers:{cookie:`drone_session=${a.token}`}});
 assert.equal(auth.session({headers:{cookie:`drone_session=${a.token}`}}),null);
});
test('invalid guesses are throttled for one minute and operator sessions expire',()=>{
 let now=1000000;
 const auth=new AuthService({simulatorToken:'test-secret',now:()=>now});
 for(let i=0;i<5;i++) assert.throws(()=>auth.pair('ZZZZ'),{code:'INVALID_PAIRING_CODE'});
 assert.throws(()=>auth.pair('BMBL'),{code:'PAIRING_RATE_LIMIT'});
 now+=60001;
 const {token}=auth.pair('BMBL');
 now+=8*60*60*1000+1;
 assert.equal(auth.session({headers:{cookie:`drone_session=${token}`}}),null);
});
