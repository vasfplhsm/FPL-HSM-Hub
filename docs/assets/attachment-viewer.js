import { attachmentLinks, validateAttachment } from './attachments.js';
import { loadPdfDocument } from './pdf-renderer.js';

export function createAttachmentViewer({loadPdf}={}) {
  let dialog,stage,status,controls,hint,zoomLabel,angleLabel,pageControls,pageLabel;
  let image,box,resizeObserver,abortController,pdfHandle,pdfPage,renderTask;
  let scale=1,fitScale=1,fitted=true,rotation=0,mode='',pageNumber=1,pageLoading=false;
  let opener=null,generation=0,renderVersion=0,activeItem,activeLinks;

  function build() {
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='attachment-dialog';
    dialog.setAttribute('aria-labelledby','attachment-viewer-title');dialog.setAttribute('aria-describedby','attachment-viewer-hint');
    dialog.innerHTML=`<header class="viewer-header"><div><span class="eyebrow">PRATONTON LAMPIRAN</span><h2 id="attachment-viewer-title"></h2></div><button class="secondary-button viewer-close" type="button" autofocus aria-label="Tutup pratonton">Tutup <span aria-hidden="true">×</span></button></header><div class="viewer-toolbar"><div class="viewer-controls"><div class="viewer-zoom" role="group" aria-label="Kawalan zum"><button class="secondary-button" type="button" data-zoom="out" aria-label="Zum keluar">−</button><output class="viewer-zoom-level" aria-label="Tahap zum" aria-live="polite"></output><button class="secondary-button" type="button" data-zoom="in" aria-label="Zum masuk">+</button><button class="secondary-button" type="button" data-zoom="fit">Muat skrin</button></div><div class="viewer-rotation" role="group" aria-label="Kawalan putaran"><button class="secondary-button" type="button" data-rotate="left" aria-label="Pusing kiri 90 darjah" title="Pusing kiri 90°">↶</button><output class="viewer-angle" aria-label="Putaran" aria-live="polite">0°</output><button class="secondary-button" type="button" data-rotate="right" aria-label="Pusing kanan 90 darjah" title="Pusing kanan 90°">↷</button><button class="secondary-button" type="button" data-rotate="reset" aria-label="Set semula putaran dan zum">Asal</button></div><div class="viewer-pages" role="group" aria-label="Halaman PDF" hidden><button class="secondary-button" type="button" data-page="previous" aria-label="Halaman sebelumnya">‹</button><output class="viewer-page-number" aria-label="Halaman PDF" aria-live="polite"></output><button class="secondary-button" type="button" data-page="next" aria-label="Halaman seterusnya">›</button></div></div><p id="attachment-viewer-hint"></p></div><div class="viewer-status" role="status" aria-live="polite"></div><div class="viewer-stage" tabindex="0" aria-label="Ruang pratonton lampiran"></div><div class="viewer-footer"><span>Tatal untuk melihat kandungan yang dibesarkan.</span><div><a class="secondary-button viewer-download" target="_blank" rel="noopener noreferrer">Muat turun</a><a class="secondary-button viewer-external" target="_blank" rel="noopener noreferrer">Buka di Google Drive ↗</a></div></div>`;
    document.body.append(dialog);
    stage=dialog.querySelector('.viewer-stage');status=dialog.querySelector('.viewer-status');
    controls=dialog.querySelector('.viewer-controls');hint=dialog.querySelector('#attachment-viewer-hint');
    zoomLabel=dialog.querySelector('.viewer-zoom-level');angleLabel=dialog.querySelector('.viewer-angle');
    pageControls=dialog.querySelector('.viewer-pages');pageLabel=dialog.querySelector('.viewer-page-number');
    dialog.querySelector('.viewer-close').addEventListener('click',close);
    dialog.querySelector('[data-zoom="out"]').addEventListener('click',()=>zoom(scale/1.25));
    dialog.querySelector('[data-zoom="in"]').addEventListener('click',()=>zoom(scale*1.25));
    dialog.querySelector('[data-zoom="fit"]').addEventListener('click',fit);
    dialog.querySelector('[data-rotate="left"]').addEventListener('click',()=>rotate(-90));
    dialog.querySelector('[data-rotate="right"]').addEventListener('click',()=>rotate(90));
    dialog.querySelector('[data-rotate="reset"]').addEventListener('click',()=>{rotation=0;fit();});
    dialog.querySelector('[data-page="previous"]').addEventListener('click',()=>showPage(pageNumber-1));
    dialog.querySelector('[data-page="next"]').addEventListener('click',()=>showPage(pageNumber+1));
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const focusable=[...dialog.querySelectorAll('button:not(:disabled), a[href], iframe, [tabindex="0"]')].filter(node=>node.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    window.addEventListener('hashchange',close);
  }
  function message(text){status.textContent=text;status.hidden=!text;}
  function dimensions() {
    if(mode==='pdf'&&pdfPage){const v=pdfPage.getViewport({scale:1,rotation:(pdfPage.rotate+rotation)%360});return {width:v.width,height:v.height};}
    if(mode==='image'&&image?.naturalWidth)return rotation%180?{width:image.naturalHeight,height:image.naturalWidth}:{width:image.naturalWidth,height:image.naturalHeight};
    return null;
  }
  function measureFit() {
    const size=dimensions();if(!size)return;
    fitScale=Math.min(1,Math.max(1,stage.clientWidth-32)/size.width,Math.max(1,stage.clientHeight-32)/size.height);
  }
  function updateScale() {
    const size=dimensions();if(!size)return;
    box.style.width=`${size.width*scale}px`;box.style.height=`${size.height*scale}px`;
    zoomLabel.textContent=`${Math.round(scale*100)}%`;angleLabel.textContent=`${rotation}°`;
    dialog.querySelector('[data-zoom="out"]').disabled=scale<=Math.min(.1,fitScale)+.001;
    dialog.querySelector('[data-zoom="in"]').disabled=scale>=4;
    if(mode==='image'){
      image.style.width=`${image.naturalWidth*scale}px`;image.style.height=`${image.naturalHeight*scale}px`;
      image.style.transform=`translate(-50%, -50%) rotate(${rotation}deg)`;
    }else void renderPdf();
  }
  function fit(){if(!dimensions())return;measureFit();scale=fitScale;fitted=true;updateScale();stage.scrollTo(0,0);}
  function zoom(next) {
    if(!dimensions())return;
    const before=box.getBoundingClientRect(),viewport=stage.getBoundingClientRect();
    const x=(viewport.left+stage.clientWidth/2-before.left)/before.width,y=(viewport.top+stage.clientHeight/2-before.top)/before.height;
    scale=Math.max(Math.min(.1,fitScale),Math.min(4,next));fitted=false;updateScale();
    const after=box.getBoundingClientRect();
    stage.scrollBy(after.left+x*after.width-(viewport.left+stage.clientWidth/2),after.top+y*after.height-(viewport.top+stage.clientHeight/2));
  }
  function rotate(delta){if(!dimensions())return;rotation=(rotation+delta+360)%360;measureFit();if(fitted)fit();else updateScale();stage.scrollTo(0,0);}
  function observeSize(){resizeObserver?.disconnect();let width=stage.clientWidth,height=stage.clientHeight;resizeObserver=new ResizeObserver(()=>{if(width===stage.clientWidth&&height===stage.clientHeight)return;width=stage.clientWidth;height=stage.clientHeight;measureFit();if(fitted)fit();});resizeObserver.observe(stage);}
  function makeSurface(){const surface=document.createElement('div');surface.className='viewer-image-surface';box=document.createElement('div');box.className='viewer-media-box';surface.append(box);stage.replaceChildren(surface);}
  function releasePdf(){renderVersion++;renderTask?.cancel();renderTask=null;pdfPage=null;const previous=pdfHandle;pdfHandle=null;if(previous)void previous.destroy().catch(()=>{});}
  function embedded(item,links,version) {
    releasePdf();image=null;mode='embedded';resizeObserver?.disconnect();controls.hidden=true;pageControls.hidden=true;stage.setAttribute('aria-busy','false');
    hint.textContent=`${item.contentType==='application/pdf'?'PDF':'Imej'} · Pratonton sandaran Google Drive. Kawalan putaran Hub tidak tersedia dalam pratonton sandaran ini.`;
    message('Memuatkan pratonton Google Drive…');
    const frame=document.createElement('iframe');frame.className='viewer-frame';frame.title=`Pratonton ${item.name}`;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-popups');frame.setAttribute('allow','fullscreen');frame.referrerPolicy='no-referrer';
    frame.addEventListener('load',()=>{if(generation===version)message('');},{once:true});
    frame.addEventListener('error',()=>{if(generation===version)message('Pratonton tidak dapat dimuatkan. Cuba pautan Buka di Google Drive.');},{once:true});
    frame.src=links.preview;stage.replaceChildren(frame);
  }
  async function renderPdf() {
    const version=generation,renderId=++renderVersion,page=pdfPage;
    renderTask?.cancel();
    const viewport=page.getViewport({scale,rotation:(page.rotate+rotation)%360});
    const canvas=document.createElement('canvas');canvas.className='viewer-pdf-canvas';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Halaman ${pageNumber} daripada ${pdfHandle.document.numPages}: ${activeItem.name}`);
    const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(8000000/(viewport.width*viewport.height)));
    canvas.width=Math.max(1,Math.floor(viewport.width*ratio));canvas.height=Math.max(1,Math.floor(viewport.height*ratio));
    canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
    stage.setAttribute('aria-busy','true');
    try{
      const task=page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],annotationMode:0});renderTask=task;
      await task.promise;
      if(generation!==version||renderVersion!==renderId)return;
      box.replaceChildren(canvas);renderTask=null;stage.setAttribute('aria-busy','false');
    }catch(error){
      if(generation!==version||renderVersion!==renderId||error.name==='RenderingCancelledException')return;
      embedded(activeItem,activeLinks,version);
    }
  }
  function pageButtons(){pageLabel.textContent=`${pageNumber} / ${pdfHandle.document.numPages}`;dialog.querySelector('[data-page="previous"]').disabled=pageLoading||pageNumber<=1;dialog.querySelector('[data-page="next"]').disabled=pageLoading||pageNumber>=pdfHandle.document.numPages;}
  async function showPage(number) {
    if(!pdfHandle||pageLoading||number<1||number>pdfHandle.document.numPages)return;
    const version=generation;pageLoading=true;pageButtons();stage.setAttribute('aria-busy','true');
    try{
      const page=await pdfHandle.document.getPage(number);
      if(generation!==version)return;
      renderVersion++;renderTask?.cancel();pdfPage?.cleanup();pdfPage=page;pageNumber=number;mode='pdf';
      controls.hidden=false;pageControls.hidden=false;message('');measureFit();if(fitted)fit();else updateScale();stage.scrollTo(0,0);observeSize();
    }catch{if(generation===version)embedded(activeItem,activeLinks,version);}
    finally{if(generation===version){pageLoading=false;if(pdfHandle)pageButtons();}}
  }
  async function openPdf(item,options,version) {
    try{
      if(!loadPdf)throw new Error('PDF service unavailable.');
      const bytes=await loadPdf(item,{noticeId:options.noticeId,signal:abortController.signal});
      if(generation!==version)return;
      const handle=await loadPdfDocument(bytes,abortController.signal);
      if(generation!==version){void handle.destroy().catch(()=>{});return;}
      pdfHandle=handle;makeSurface();await showPage(1);
    }catch{if(generation===version)embedded(item,activeLinks,version);}
  }
  function close() {
    if(!dialog?.open)return;
    generation++;resizeObserver?.disconnect();releasePdf();abortController?.abort();image=null;pageLoading=false;mode='';
    stage.replaceChildren();document.documentElement.classList.remove('attachment-open');dialog.close();
    if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;
  }
  return {
    open(value,trigger=document.activeElement,options={}) {
      const item=validateAttachment(value),links=attachmentLinks(item);build();if(dialog.open)return;
      opener=trigger;const version=++generation;activeItem=item;activeLinks=links;rotation=0;fitted=true;scale=1;pageNumber=1;mode='loading';abortController=new AbortController();
      dialog.querySelector('#attachment-viewer-title').textContent=item.name;dialog.querySelector('.viewer-download').href=links.download;dialog.querySelector('.viewer-external').href=links.view;
      controls.hidden=true;pageControls.hidden=true;message('Memuatkan pratonton…');stage.setAttribute('aria-busy','true');
      document.documentElement.classList.add('attachment-open');dialog.showModal();
      hint.textContent=`${item.contentType==='application/pdf'?'PDF':'Imej'} · Zum + / −, pusing ↶ / ↷, Muat skrin atau Asal untuk set semula.`;
      if(item.contentType==='application/pdf'){void openPdf(item,options,version);return;}
      mode='image';makeSurface();
      const picture=document.createElement('img');picture.className='viewer-image';picture.alt=item.name;picture.referrerPolicy='no-referrer';picture.hidden=true;image=picture;box.append(picture);
      picture.addEventListener('load',()=>{if(generation!==version)return;message('');picture.hidden=false;controls.hidden=false;stage.setAttribute('aria-busy','false');fit();observeSize();},{once:true});
      picture.addEventListener('error',()=>{if(generation===version)embedded(item,links,version);},{once:true});picture.src=links.largeImage;
    },close
  };
}
