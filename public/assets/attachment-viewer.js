import { attachmentLinks, validateAttachment } from './attachments.js';

// Images use local zoom controls. PDF zoom/page controls belong to Drive's
// embedded viewer; its cross-origin document cannot be controlled by the Hub.
export function createAttachmentViewer() {
  let dialog, stage, status, controls, hint, zoomLabel, image, resizeObserver;
  let scale=1, fitScale=1, fitted=true, opener=null, generation=0;

  function build() {
    if (dialog) return;
    dialog=document.createElement('dialog');
    dialog.className='attachment-dialog';
    dialog.setAttribute('aria-labelledby','attachment-viewer-title');
    dialog.setAttribute('aria-describedby','attachment-viewer-hint');
    dialog.innerHTML=`<header class="viewer-header"><div><span class="eyebrow">PRATONTON LAMPIRAN</span><h2 id="attachment-viewer-title"></h2></div><button class="secondary-button viewer-close" type="button" autofocus aria-label="Tutup pratonton">Tutup <span aria-hidden="true">×</span></button></header><div class="viewer-toolbar"><div class="viewer-zoom" role="group" aria-label="Kawalan zum imej"><button class="secondary-button" type="button" data-zoom="out" aria-label="Zum keluar">−</button><output class="viewer-zoom-level" aria-label="Tahap zum" aria-live="polite"></output><button class="secondary-button" type="button" data-zoom="in" aria-label="Zum masuk">+</button><button class="secondary-button" type="button" data-zoom="fit">Muat skrin</button></div><p id="attachment-viewer-hint"></p></div><div class="viewer-status" role="status" aria-live="polite"></div><div class="viewer-stage" tabindex="0" aria-label="Ruang pratonton lampiran"></div><div class="viewer-footer"><span>Tatal untuk melihat kandungan yang dibesarkan.</span><div><a class="secondary-button viewer-download" target="_blank" rel="noopener noreferrer">Muat turun</a><a class="secondary-button viewer-external" target="_blank" rel="noopener noreferrer">Buka di Google Drive ↗</a></div></div>`;
    document.body.append(dialog);
    stage=dialog.querySelector('.viewer-stage');
    status=dialog.querySelector('.viewer-status');
    controls=dialog.querySelector('.viewer-zoom');
    hint=dialog.querySelector('#attachment-viewer-hint');
    zoomLabel=dialog.querySelector('.viewer-zoom-level');
    dialog.querySelector('.viewer-close').addEventListener('click',close);
    dialog.querySelector('[data-zoom="out"]').addEventListener('click',()=>zoom(scale/1.25));
    dialog.querySelector('[data-zoom="in"]').addEventListener('click',()=>zoom(scale*1.25));
    dialog.querySelector('[data-zoom="fit"]').addEventListener('click',fit);
    dialog.addEventListener('click',event=>{
      if (event.target!==dialog) return;
      const rect=dialog.getBoundingClientRect();
      if (event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) close();
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab') return;
      const focusable=[...dialog.querySelectorAll('button:not(:disabled), a[href], iframe, [tabindex="0"]')].filter(node=>node.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    window.addEventListener('hashchange',close);
  }

  function message(text) { status.textContent=text;status.hidden=!text; }
  function updateScale() {
    if (!image?.naturalWidth) return;
    image.style.width=`${Math.round(image.naturalWidth*scale)}px`;
    image.style.height=`${Math.round(image.naturalHeight*scale)}px`;
    zoomLabel.textContent=`${Math.round(scale*100)}%`;
    dialog.querySelector('[data-zoom="out"]').disabled=scale<=Math.min(.1,fitScale)+.001;
    dialog.querySelector('[data-zoom="in"]').disabled=scale>=4;
  }
  function fit() {
    if (!image?.naturalWidth) return;
    fitScale=Math.min(1,Math.max(1,stage.clientWidth-32)/image.naturalWidth,Math.max(1,stage.clientHeight-32)/image.naturalHeight);
    scale=fitScale;fitted=true;updateScale();stage.scrollTo(0,0);
  }
  function zoom(next) {
    if (!image?.naturalWidth) return;
    const before=image.getBoundingClientRect(), viewport=stage.getBoundingClientRect();
    const x=(viewport.left+stage.clientWidth/2-before.left)/before.width;
    const y=(viewport.top+stage.clientHeight/2-before.top)/before.height;
    scale=Math.max(Math.min(.1,fitScale),Math.min(4,next));fitted=false;updateScale();
    const after=image.getBoundingClientRect();
    stage.scrollBy(after.left+x*after.width-(viewport.left+stage.clientWidth/2),after.top+y*after.height-(viewport.top+stage.clientHeight/2));
  }
  function embedded(item,links,version) {
    image=null;resizeObserver?.disconnect();controls.hidden=true;
    hint.textContent=`${item.contentType==='application/pdf'?'PDF':'Imej'} · Gunakan kawalan zum dalam pratonton Google Drive untuk membesar atau mengecilkan paparan.`;
    message('Memuatkan pratonton Google Drive…');
    const frame=document.createElement('iframe');
    frame.className='viewer-frame';frame.title=`Pratonton ${item.name}`;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-popups');
    frame.setAttribute('allow','fullscreen');frame.referrerPolicy='no-referrer';
    frame.addEventListener('load',()=>{if(generation===version) message('');},{once:true});
    frame.addEventListener('error',()=>{if(generation===version) message('Pratonton tidak dapat dimuatkan. Cuba pautan Buka di Google Drive.');},{once:true});
    frame.src=links.preview;stage.replaceChildren(frame);
  }
  function close() {
    if(!dialog?.open) return;
    generation++;resizeObserver?.disconnect();image=null;
    stage.replaceChildren(); // Also unload the external PDF frame on close.
    document.documentElement.classList.remove('attachment-open');dialog.close();
    if(opener?.isConnected)opener.focus({preventScroll:true});
    opener=null;
  }

  return {
    open(value,trigger=document.activeElement) {
      const item=validateAttachment(value),links=attachmentLinks(item);
      build();
      if (dialog.open) return;
      opener=trigger;const version=++generation;
      dialog.querySelector('#attachment-viewer-title').textContent=item.name;
      dialog.querySelector('.viewer-download').href=links.download;
      dialog.querySelector('.viewer-external').href=links.view;
      controls.hidden=true;message('Memuatkan pratonton…');
      document.documentElement.classList.add('attachment-open');dialog.showModal();
      if (item.contentType==='application/pdf') { embedded(item,links,version);return; }
      hint.textContent='Imej · Gunakan + / − untuk zum, atau Muat skrin untuk melihat keseluruhan imej.';
      const surface=document.createElement('div');surface.className='viewer-image-surface';
      const picture=document.createElement('img');picture.className='viewer-image';picture.alt=item.name;picture.referrerPolicy='no-referrer';picture.hidden=true;
      image=picture;surface.append(picture);stage.replaceChildren(surface);
      picture.addEventListener('load',()=>{
        if(generation!==version) return;
        message('');picture.hidden=false;controls.hidden=false;fit();
        resizeObserver=new ResizeObserver(()=>{if(fitted)fit();});resizeObserver.observe(stage);
      },{once:true});
      // Some Drive accounts cannot serve thumbnails. Keep an in-app preview
      // available through the same embedded viewer used for PDFs.
      picture.addEventListener('error',()=>{if(generation===version)embedded(item,links,version);},{once:true});
      picture.src=links.largeImage;
    },
    close
  };
}
