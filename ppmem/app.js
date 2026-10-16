import cameras from './cases-1ecdd41f6bc2.js?v=org20261016';
const $ = selector => document.querySelector(selector);
const video = $('#atlas'), grid = $('#scene-grid'), canvases = [...grid.querySelectorAll('canvas')];
const contexts = canvases.map(c => c.getContext('2d'));
const timeline=$('#timeline'), split=$('#split'), fullDemo=$('#full-demo');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let camera='repeat', view='rgb', divider=.5, poster=null, ready=false, generation=0;
let wantsPlayback=!reducedMotion, inView=false, userPaused=reducedMotion, callback=0;
const imageCache=new Map();
function getImage(file) {
  if(!imageCache.has(file)) imageCache.set(file,new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Preview image unavailable'));image.src=`./assets/${file}`;
  }));
  return imageCache.get(file);
}
function render() {
  const useVideo=ready && video.readyState>=2;
  if(!useVideo && !poster) return;
  contexts.forEach((ctx,i)=>{
    const width=1024,height=576,x=(i%2)*512,y=Math.floor(i/2)*288;
    const source=useVideo?video:poster;
    ctx.clearRect(0,0,width,height);ctx.drawImage(source,x,y,512,288,0,0,width,height);
    if(view!=='rgb' && useVideo) {
      const skew=height*.18,center=-skew-8+divider*(width+2*skew+16),top=center+skew,bottom=center-skew;
      ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(top,0);ctx.lineTo(bottom,height);ctx.lineTo(0,height);ctx.closePath();ctx.clip();
      ctx.drawImage(video,x+(view==='normal'?1024:2048),y,512,288,0,0,width,height);ctx.restore();
      if(divider>0 && divider<1){ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.shadowColor='#0006';ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(top,0);ctx.lineTo(bottom,height);ctx.stroke();ctx.shadowBlur=0;}
    }
  });
  timeline.value=String(Math.min(cameras[camera].frames-1,Math.floor(video.currentTime*15)));
  $('#time').textContent=`${video.currentTime.toFixed(1)} / ${(cameras[camera].frames/15).toFixed(1)} s`;
}
function loop(){render();callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(loop):requestAnimationFrame(loop);}
function updatePlayback(){
  const active=!video.paused;
  $('#play-text').textContent=active?'Pause':'Play';$('#play').setAttribute('aria-label',active?'Pause generated videos':'Play generated videos');
  $('#play-icon').setAttribute('d',active?'M7 5h3v14H7zM14 5h3v14h-3z':'m8 5 11 7-11 7z');
}
function showError(message){$('#viewer-error').textContent=message;$('#viewer-error').hidden=false;}
async function play(){
  if(!ready || !inView || !fullDemo.paused) return;
  try { await video.play(); } catch(error) {if(error.name!=='AbortError'){userPaused=true;wantsPlayback=false;updatePlayback();}}
}
async function selectCamera(id){
  const token=++generation;camera=id;ready=false;video.pause();poster=null;
  $('#viewer-error').hidden=true;
  document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===id)));
  grid.querySelectorAll('figcaption').forEach((label,i)=>{label.textContent=cameras[id].scenes[i];canvases[i].setAttribute('aria-label',`${cameras[id].scenes[i]} generated video, ${id} camera motion`);});
  timeline.max=String(cameras[id].frames-1);timeline.value='0';$('#motion-caption').textContent=cameras[id].caption;
  updateView();
  try {
    const loaded=await getImage(cameras[id].poster);if(token!==generation)return;poster=loaded;render();
    video.src=cameras[id].file;video.load();
  } catch {if(token===generation)showError('The preview could not be loaded. Please reload the page.');}
}
function updateView(){
  const compare=view!=='rgb';
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  $('#comparison-control').hidden=!compare;
  $('#split-left').textContent=view==='normal'?'Normal':'Depth';
  $('#split-right').textContent='RGB';
  $('#viewer-hint').textContent=view==='rgb'?'Choose Normal or Depth to compare geometry with RGB.':'Drag the divider to compare the same moment in both views.';
  updatePlayback();render();
}
document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>selectCamera(button.dataset.camera)));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  view=button.dataset.view;divider=.5;split.value='50';updateView();if(wantsPlayback)play();
}));
video.addEventListener('loadeddata',()=>{if(!video.currentSrc.endsWith(cameras[camera].file))return;ready=true;render();if(wantsPlayback)play();});
video.addEventListener('seeked',render);video.addEventListener('pause',updatePlayback);video.addEventListener('play',updatePlayback);
video.addEventListener('error',()=>{ready=false;showError('This video could not be loaded. Try another camera motion or reload the page.');});
video.addEventListener('ended',()=>{video.currentTime=0;if(wantsPlayback)play();});
$('#play').addEventListener('click',()=>{
  if(video.paused){userPaused=false;wantsPlayback=true;play();}else{userPaused=true;wantsPlayback=false;video.pause();}
});
timeline.addEventListener('input',()=>{userPaused=true;wantsPlayback=false;video.pause();video.currentTime=Number(timeline.value)/15;});
split.addEventListener('input',()=>{divider=Number(split.value)/100;render();});
new IntersectionObserver(entries=>{
  inView=entries[0].isIntersecting;
  if(!inView)video.pause();else if(!userPaused&&wantsPlayback)play();
},{threshold:.12}).observe(grid);
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();fullDemo.pause();}else if(!userPaused&&wantsPlayback)play();});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)fullDemo.pause();},{threshold:.05}).observe(fullDemo);
fullDemo.addEventListener('play',()=>video.pause());
document.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>{
  fullDemo.currentTime=Number(button.dataset.time);fullDemo.play().catch(()=>{});
}));
const dialog=$('#figure-dialog');
document.querySelectorAll('[data-lightbox]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();const image=link.querySelector('img');$('#enlarged-figure').src=link.href;$('#enlarged-figure').alt=image.alt;
  $('#figure-caption').textContent=link.dataset.caption;dialog.showModal();document.body.classList.add('dialog-open');
}));
$('#close-figure').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
selectCamera('repeat');loop();

const copyBibtex = $('#copy-bibtex');
let copyReset;
copyBibtex.addEventListener('click', async () => {
  clearTimeout(copyReset);
  try {
    await navigator.clipboard.writeText($('#bibtex-entry').textContent.trim());
    copyBibtex.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('#bibtex-entry'));
    const selection = window.getSelection();
    if (selection) {selection.removeAllRanges(); selection.addRange(range);}
    copyBibtex.textContent = 'Select & copy';
  }
  copyReset = setTimeout(() => {copyBibtex.textContent = 'Copy';}, 2500);
});
