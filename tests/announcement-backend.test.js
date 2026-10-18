import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnnouncementBackend } from '../public/assets/announcement-backend.js';
const config = {projectId:'test-project',apiKey:'test-public-key'};
const ok = value => new Response(JSON.stringify(value), {status:200,headers:{'Content-Type':'application/json'}});

test('anonymous visitors can read public announcements but cannot submit a write', async () => {
  const requests = [];
  const backend = createAnnouncementBackend(config, async (url, options) => {
    requests.push({url,options});
    return ok({documents:[{name:'projects/test/announcements/test-id',fields:{title:{stringValue:'Notice'},body:{stringValue:'Text'},date:{stringValue:'2026-10-18'}}}]});
  });
  assert.deepEqual(await backend.listAnnouncements(), [{id:'test-id',title:'Notice',body:'Text',date:'2026-10-18'}]);
  await assert.rejects(backend.saveAnnouncement(null,{title:'x',body:'y',date:''}), /sign-in/);
  await assert.rejects(backend.deleteAnnouncement('test-id'), /sign-in/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.credentials, 'omit');
});

test('a signed-in account without an enabled admin role cannot publish', async () => {
  const backend = createAnnouncementBackend(config, async url => url.includes('signInWithPassword') ? ok({idToken:'test-id-token',refreshToken:'test-refresh',localId:'test-user',expiresIn:'3600'}) : ok({fields:{enabled:{booleanValue:false}}}));
  await assert.rejects(backend.signIn('reader@example.test','test-only-password'), /not enabled/);
  await assert.rejects(backend.saveAnnouncement(null,{title:'x',body:'y'}), /sign-in/);
});

test('admin mutations carry the ID token, server timestamp and correct create/update preconditions', async () => {
  const requests = [];
  const backend = createAnnouncementBackend(config, async (url, options) => {
    requests.push({url,options});
    if (url.includes('signInWithPassword')) return ok({idToken:'test-id-token',refreshToken:'test-refresh',localId:'test-admin',expiresIn:'3600'});
    if (url.includes('/admins/')) return ok({fields:{enabled:{booleanValue:true}}});
    return ok({});
  });
  await backend.signIn('admin@example.test','test-only-password');
  const notice={title:'Notice',body:'Text',date:'2026-10-18'};
  await backend.saveAnnouncement(null,notice);
  await backend.saveAnnouncement('existing-id',notice);
  await backend.deleteAnnouncement('existing-id');
  const writes = requests.filter(r=>r.url.includes(':commit'));
  assert.equal(writes.length,3);
  for (const request of writes) assert.equal(request.options.headers.Authorization,'Bearer test-id-token');
  const [create,update,remove] = writes.map(r=>JSON.parse(r.options.body).writes[0]);
  assert.equal(create.currentDocument.exists,false);
  assert.equal(update.currentDocument.exists,true);
  assert.equal(update.update.name,'projects/test-project/databases/(default)/documents/announcements/existing-id');
  assert.deepEqual(update.updateTransforms,[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]);
  assert.equal(remove.delete,update.update.name);
  await assert.rejects(backend.deleteAnnouncement('../admins/test-user'), /Invalid/);
  backend.signOut();
  await assert.rejects(backend.saveAnnouncement(null,notice), /sign-in/);
});

test('expired sessions refresh in memory; rejected service responses do not report success', async () => {
  const backend = createAnnouncementBackend(config, async (url,options) => {
    if (url.includes('signInWithPassword')) return ok({idToken:'old-token',refreshToken:'test-refresh',localId:'test-admin',expiresIn:'0'});
    if (url.includes('/admins/')) return ok({fields:{enabled:{booleanValue:true}}});
    if (url.includes('securetoken')) {
      assert.equal(new URLSearchParams(options.body).get('refresh_token'),'test-refresh');
      return ok({id_token:'new-token',refresh_token:'new-refresh',expires_in:'3600'});
    }
    assert.equal(options.headers.Authorization,'Bearer new-token');
    return new Response('{}',{status:403});
  });
  await backend.signIn('admin@example.test','test-only-password');
  await assert.rejects(backend.saveAnnouncement('test-id',{title:'x',body:'y',date:''}), /rejected/);
});
