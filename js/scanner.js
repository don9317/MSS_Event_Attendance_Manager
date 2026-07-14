let scannerStream=null,scannerTimer=null,barcodeDetector=null,scannerBusy=false;
function scannerSupported(){return 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;}
async function openScanner(){
  $('scannerModal').classList.add('show');
  if(!scannerSupported()){
    $('scannerStatus').className='readyBox red';
    $('scannerStatus').innerHTML='Camera QR scanning is not supported in this browser. Use Chrome/Edge, a USB scanner, or manual search.';
    return;
  }
  try{
    $('scannerStatus').className='readyBox yellow';
    $('scannerStatus').textContent='Requesting camera access...';
    barcodeDetector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','upc_a']});
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    const video=$('scannerVideo'); video.srcObject=scannerStream; await video.play();
    $('scannerStatus').className='readyBox green';
    $('scannerStatus').textContent='Scanner active. Point camera at QR code.';
    scannerBusy=false; scanLoop();
  }catch(err){
    $('scannerStatus').className='readyBox red';
    $('scannerStatus').innerHTML='Camera could not be started. Allow camera access, use HTTPS/GitHub Pages, or use manual lookup.';
  }
}
function scanLoop(){
  clearTimeout(scannerTimer);
  scannerTimer=setTimeout(async()=>{
    if(!$('scannerModal').classList.contains('show')) return;
    try{
      const video=$('scannerVideo');
      if(barcodeDetector && video.readyState>=2 && !scannerBusy){
        const codes=await barcodeDetector.detect(video);
        if(codes && codes.length){
          scannerBusy=true;
          const raw=codes[0].rawValue||'';
          $('scannerStatus').className='readyBox green';
          $('scannerStatus').textContent='Code detected. Processing...';
          const p=processScannedCode(raw,'camera');
          if(p){ closeScanner(); return; }
          setTimeout(()=>{scannerBusy=false; scanLoop();},1200);
          return;
        }
      }
    }catch(e){}
    scanLoop();
  },350);
}
function closeScanner(){
  clearTimeout(scannerTimer); scannerTimer=null; scannerBusy=false;
  if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;}
  const video=$('scannerVideo'); if(video) video.srcObject=null;
  $('scannerModal').classList.remove('show');
}
function restartScanner(){closeScanner();setTimeout(openScanner,150);}
function showScanToast(title,body,color='green'){
  const t=$('scanToast'); if(!t)return;
  $('scanToastTitle').textContent=title;
  $('scanToastBody').innerHTML=body;
  t.className='scanToast '+color;
  setTimeout(()=>t.classList.add('hidden'),2200);
}
