// Lazy, locally bundled Mozilla PDF.js. The Hub never runs document scripts,
// forms or embedded actions; it only renders page content to a canvas.
export async function loadPdfDocument(bytes,signal) {
  const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
  if(signal.aborted)throw new DOMException('Preview closed.','AbortError');
  const asset=name=>new URL('./vendor/pdfjs/'+name,import.meta.url).href;
  pdfjs.GlobalWorkerOptions.workerSrc=asset('pdf.worker.mjs');
  const loading=pdfjs.getDocument({data:bytes,cMapUrl:asset('cmaps/'),cMapPacked:true,standardFontDataUrl:asset('standard_fonts/'),iccUrl:asset('iccs/'),wasmUrl:asset('wasm/'),isEvalSupported:false,enableXfa:false});
  const abort=()=>{void loading.destroy().catch(()=>{});};
  signal.addEventListener('abort',abort,{once:true});
  try {
    const document=await loading.promise;
    if(signal.aborted)throw new DOMException('Preview closed.','AbortError');
    return {document,destroy:()=>{signal.removeEventListener('abort',abort);return loading.destroy();}};
  }catch(error){signal.removeEventListener('abort',abort);await loading.destroy().catch(()=>{});throw error;}
}
