// Firebase's documented REST APIs. Tokens stay in this closure, never in storage.
export function createAnnouncementBackend(config, request = fetch) {
  const key = encodeURIComponent(config.apiKey);
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents`;
  let session = null;
  async function json(url, options = {}) {
    const response = await request(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(12000), ...options });
    if (!response.ok) throw new Error('The announcement service rejected the request.');
    return response.json();
  }
  const body = value => ({ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(value) });
  async function token() {
    if (!session) throw new Error('Admin sign-in is required.');
    if (session.expiresAt < Date.now() + 60000) {
      const refreshed = await json(`https://securetoken.googleapis.com/v1/token?key=${key}`, {
        method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refreshToken}).toString()
      });
      session.idToken = refreshed.id_token;
      session.refreshToken = refreshed.refresh_token;
      session.expiresAt = Date.now() + Number(refreshed.expires_in) * 1000;
    }
    return session.idToken;
  }
  function documentName(id) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid announcement ID.');
    return root.slice('https://firestore.googleapis.com/v1/'.length) + '/announcements/' + id;
  }
  return {
    async listAnnouncements() {
      const result = await json(`${root}/announcements?key=${key}&pageSize=20&orderBy=updatedAt%20desc`);
      return (result.documents || []).map(document => ({
        id:document.name.split('/').pop(),
        title:document.fields?.title?.stringValue ?? '',
        body:document.fields?.body?.stringValue ?? '',
        date:document.fields?.date?.stringValue ?? ''
      }));
    },
    async signIn(email, password) {
      session = null;
      const result = await json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, body({email,password,returnSecureToken:true}));
      const candidate = {idToken:result.idToken, refreshToken:result.refreshToken, uid:result.localId, expiresAt:Date.now()+Number(result.expiresIn)*1000};
      // This document is writable only through the trusted Firebase console/Admin SDK.
      const role = await json(`${root}/admins/${encodeURIComponent(candidate.uid)}?key=${key}`, {headers:{Authorization:`Bearer ${candidate.idToken}`}});
      if (role.fields?.enabled?.booleanValue !== true) throw new Error('Admin access is not enabled.');
      session = candidate;
    },
    signOut() { session = null; },
    async saveAnnouncement(id, notice) {
      const name = documentName(id || crypto.randomUUID());
      const fields = Object.fromEntries(['title','body','date'].map(field => [field,{stringValue:notice[field] || ''}]));
      await json(`${root}:commit?key=${key}`, {
        ...body({writes:[{update:{name,fields}, updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}], currentDocument:{exists:Boolean(id)}}]}),
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`}
      });
    },
    async deleteAnnouncement(id) {
      await json(`${root}:commit?key=${key}`, {
        ...body({writes:[{delete:documentName(id),currentDocument:{exists:true}}]}),
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`}
      });
    }
  };
}
