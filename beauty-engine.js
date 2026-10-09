/* Mimo Beauty Engine v2.7.2 — local processing, face masks and Safari blur fallback. */
import {createBeautyBlur} from "./beauty-blur.js?v=20261010-v27";
export function createBeautyEngine(video, options = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx || !canvas.captureStream) throw new Error("Canvas video processing unavailable");
  let settings = { smoothing: 0, whitening: 0, rosy: 0, slim_face: 0, big_eyes: 0, chin: 0, nose: 0, eye_brightening: 0, dark_circle: 0, background_blur: 0, enabled: true, ...options };
  let active = false, disposed = false, frame = 0, stream = null, renderSamples=[], qualityWidth=480, lastQualityCheck=0, targetFps=24, lastRenderTime=-Infinity, lastRenderedVideoTime=-1, dirty=true, warpedPixels=0, processingError="";
  const softCanvas = document.createElement("canvas");
  const softCtx = softCanvas.getContext("2d");
  if (!softCtx) throw new Error("Canvas smoothing unavailable");
  const blur=createBeautyBlur();
  const skinCanvas=document.createElement("canvas"),skinCtx=skinCanvas.getContext("2d",{willReadFrequently:true});
  const featherCanvas=document.createElement("canvas"),featherCtx=featherCanvas.getContext("2d",{willReadFrequently:true});
  if(!skinCtx||!featherCtx)throw new Error("Canvas skin mask unavailable");

  let tracker = null, face = null, trackingStatus = "loading", lastDetect = 0, videoTime = -1, trackingError = "";
  let segmenter=null, personMask=null, segmentationStatus="idle", lastSegment=0, stableFace=null;
  let visionLibrary=null, visionFiles=null, lastSegmentVideoTime=-1, lastDetectVideoTime=-1, segmentationError="";
  async function loadSegmenter(){
    if(disposed || !visionLibrary || segmentationStatus!=="idle")return;
    segmentationStatus="loading";
    try {
      const loaded=await visionLibrary.ImageSegmenter.createFromOptions(visionFiles,{
        baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",delegate:"CPU"},
        runningMode:"VIDEO",outputCategoryMask:true,outputConfidenceMasks:false
      });
      if(disposed){loaded.close();return;}
      segmenter=loaded;segmentationStatus="ready";
    }catch(error){if(!disposed){segmentationStatus="unavailable";segmentationError=error?.message||String(error);}}
  }
  (async () => {
    const model = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
    const versions = ["0.10.14", "0.10.3"];
    for (const version of versions) {
      try {
        trackingStatus = "loading";
        const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + version;
        const lib = await import(base + "/vision_bundle.mjs");
        if(disposed)return;
        const vision = await lib.FilesetResolver.forVisionTasks(base + "/wasm");
        if(disposed)return;
        const loaded = await lib.FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: model, delegate: "CPU" },
          runningMode: "VIDEO", numFaces: 1
        });
        if(disposed){loaded.close();return;}
        tracker=loaded;visionLibrary=lib;visionFiles=vision;
        trackingStatus = "ready";
        trackingError = "";
        // Segmentation loads only when background blur is requested.
        return;
      } catch (error) {
        if(disposed)return;
        trackingError = version + ": " + (error?.message || String(error));
        console.warn("Mimo FaceLandmarker failed", trackingError);
      }
    }
    trackingStatus = "unavailable";
  })();
  const amount=name=>Math.max(0,Math.min(1,(Number(settings[name])||0)/100));
  function geometry(width,height){
    const p=id=>({x:face[id].x*width,y:face[id].y*height});
    const L=p(234),R=p(454),J=p(152),T=p(10),fw=Math.hypot(R.x-L.x,R.y-L.y);
    if(fw<28)return null;
    const ux=(R.x-L.x)/fw,uy=(R.y-L.y)/fw;
    let vx=-uy,vy=ux;if((J.x-T.x)*vx+(J.y-T.y)*vy<0){vx=-vx;vy=-vy;}
    return {p,fw,ux,uy,vx,vy,angle:Math.atan2(uy,ux)};
  }
  function warpFace(width,height){
    warpedPixels=0;
    if(!face||!settings.enabled)return;
    const slim=amount("slim_face"),eyes=amount("big_eyes"),chin=amount("chin"),nose=amount("nose");
    if(!slim&&!eyes&&!chin&&!nose)return;
    const g=geometry(width,height);if(!g)return;
    const {p,fw,ux,uy,vx,vy}=g,zones=[];
    const add=(pt,rx,ry,dx,dy,power,kind="displace")=>{
      if(power>0&&(kind==="eye"||dx||dy))zones.push({x:pt.x,y:pt.y,rx,ry,dx:dx*ux+dy*vx,dy:dx*uy+dy*vy,power,kind});
    };
    // Inverse mapping pulls source outward; the visible contour moves inward.
    [132,58,172,136,150].forEach((id,i)=>add(p(id),fw*.20,fw*.25,-fw*(.012+.003*i)*slim,0,1));
    [361,288,397,365,379].forEach((id,i)=>add(p(id),fw*.20,fw*.25,fw*(.012+.003*i)*slim,0,1));
    add(p(152),fw*.24,fw*.20,0,fw*.025*chin,1);
    for(const [outer,inner] of [[33,133],[263,362]]){
      const a=p(outer),b=p(inner);add({x:(a.x+b.x)/2,y:(a.y+b.y)/2},fw*.16,fw*.12,0,0,eyes*.40,"eye");
    }
    add(p(98),fw*.12,fw*.14,-fw*.012*nose,0,1);add(p(327),fw*.12,fw*.14,fw*.012*nose,0,1);
    // Read and visit only the union of landmark-attached zones, with a sampling margin.
    let xmin=width,ymin=height,xmax=0,ymax=0;
    for(const z of zones){const rx=Math.hypot(z.rx*ux,z.ry*vx),ry=Math.hypot(z.rx*uy,z.ry*vy);xmin=Math.min(xmin,z.x-rx);xmax=Math.max(xmax,z.x+rx);ymin=Math.min(ymin,z.y-ry);ymax=Math.max(ymax,z.y+ry);}
    xmin=Math.max(0,Math.floor(xmin));ymin=Math.max(0,Math.floor(ymin));xmax=Math.min(width,Math.ceil(xmax));ymax=Math.min(height,Math.ceil(ymax));
    const rw=xmax-xmin,rh=ymax-ymin;if(rw<=0||rh<=0)return;
    const margin=Math.ceil(fw*.13)+2,sx0=Math.max(0,xmin-margin),sy0=Math.max(0,ymin-margin),sw=Math.min(width,xmax+margin)-sx0,sh=Math.min(height,ymax+margin)-sy0;
    const source=ctx.getImageData(sx0,sy0,sw,sh),output=ctx.getImageData(xmin,ymin,rw,rh),src=source.data,dst=output.data;
    warpedPixels=rw*rh;
    for(let y=ymin;y<ymax;y++)for(let x=xmin;x<xmax;x++){
      let sx=x,sy=y,hit=false,shiftX=0,shiftY=0,weight=0;
      for(const z of zones){
        const dx=x-z.x,dy=y-z.y,nx=(dx*ux+dy*uy)/z.rx,ny=(dx*vx+dy*vy)/z.ry,q=nx*nx+ny*ny;
        if(q>=1)continue;
        const fall=(1-q)*(1-q)*z.power;
        if(z.kind==="eye"){const k=1-.16*fall;sx=z.x+(sx-z.x)*k;sy=z.y+(sy-z.y)*k;}
        else{shiftX+=z.dx*fall;shiftY+=z.dy*fall;weight+=fall;}hit=true;
      }
      if(!hit)continue;
      // Overlapping jaw anchors blend rather than adding five pulls together.
      sx+=shiftX/Math.max(1,weight);sy+=shiftY/Math.max(1,weight);
      const distance=Math.hypot(sx-x,sy-y),limit=fw*.03;if(distance>limit){sx=x+(sx-x)*limit/distance;sy=y+(sy-y)*limit/distance;}
      sx=Math.max(0,Math.min(width-1,sx))-sx0;sy=Math.max(0,Math.min(height-1,sy))-sy0;
      const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(sw-1,x0+1),y1=Math.min(sh-1,y0+1),fx=sx-x0,fy=sy-y0,to=((y-ymin)*rw+x-xmin)*4;
      const i00=(y0*sw+x0)*4,i10=(y0*sw+x1)*4,i01=(y1*sw+x0)*4,i11=(y1*sw+x1)*4;
      for(let k=0;k<3;k++)dst[to+k]=src[i00+k]*(1-fx)*(1-fy)+src[i10+k]*fx*(1-fy)+src[i01+k]*(1-fx)*fy+src[i11+k]*fx*fy;
    }
    ctx.putImageData(output,xmin,ymin);
  }
  function smoothSkin(width,height){
    const strength=amount("smoothing")*.48;
    if(!strength||!face)return;
    const g=geometry(width,height);if(!g)return;
    const {p,fw,angle}=g;
    const contour=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109].map(p);
    skinCtx.clearRect(0,0,width,height);skinCtx.fillStyle="#fff";
    skinCtx.beginPath();skinCtx.moveTo(contour[0].x,contour[0].y);
    for(const q of contour.slice(1))skinCtx.lineTo(q.x,q.y);
    skinCtx.closePath();skinCtx.fill();
    blur.draw(skinCanvas,featherCtx,Math.max(.8,fw*.008),width,height);
    // Feathered feature exclusions avoid hard ellipse seams and preserve processed detail.
    const protect=(pt,rx,ry)=>{
      featherCtx.save();featherCtx.translate(pt.x,pt.y);featherCtx.rotate(angle);featherCtx.scale(rx,ry);
      const gradient=featherCtx.createRadialGradient(0,0,.45,0,0,1);
      gradient.addColorStop(0,"rgba(0,0,0,1)");gradient.addColorStop(1,"rgba(0,0,0,0)");
      featherCtx.globalCompositeOperation="destination-out";featherCtx.fillStyle=gradient;
      featherCtx.beginPath();featherCtx.arc(0,0,1,0,Math.PI*2);featherCtx.fill();featherCtx.restore();
    };
    const midpoint=(a,b)=>({x:(p(a).x+p(b).x)/2,y:(p(a).y+p(b).y)/2});
    protect(midpoint(33,133),fw*.16,fw*.105);protect(midpoint(263,362),fw*.16,fw*.105);
    protect(midpoint(70,107),fw*.17,fw*.075);protect(midpoint(300,336),fw*.17,fw*.075);
    protect(p(1),fw*.10,fw*.16);protect(p(13),fw*.21,fw*.12);
    blur.draw(canvas,softCtx,.7+strength*4,width,height);
    const pad=Math.ceil(fw*.03),x0=Math.max(0,Math.floor(Math.min(...contour.map(q=>q.x)))-pad),y0=Math.max(0,Math.floor(Math.min(...contour.map(q=>q.y)))-pad);
    const rw=Math.min(width,Math.ceil(Math.max(...contour.map(q=>q.x)))+pad)-x0,rh=Math.min(height,Math.ceil(Math.max(...contour.map(q=>q.y)))+pad)-y0;
    if(rw<=0||rh<=0)return;
    const original=ctx.getImageData(x0,y0,rw,rh),soft=softCtx.getImageData(x0,y0,rw,rh).data,mask=featherCtx.getImageData(x0,y0,rw,rh).data,d=original.data;
    for(let i=0;i<d.length;i+=4){
      if(!mask[i+3])continue;
      const difference=Math.abs((d[i]+d[i+1]+d[i+2]-soft[i]-soft[i+1]-soft[i+2])/3);
      const mix=strength*(mask[i+3]/255)/(1+difference*difference/576);
      for(let k=0;k<3;k++)d[i+k]+=(soft[i+k]-d[i+k])*mix;
    }
    ctx.putImageData(original,x0,y0);
  }
  function regionalBeauty(width,height){
    if(!face||!settings.enabled)return;
    const eyeBright=Math.max(0,Math.min(1,(+settings.eye_brightening||0)/100));
    const dark=Math.max(0,Math.min(1,(+settings.dark_circle||0)/100));
    if(!eyeBright&&!dark)return;
    const g=geometry(width,height);if(!g)return;
    const {p,ux,uy,vx,vy}=g;
    const L0=p(33),L1=p(133),R0=p(263),R1=p(362);
    const faceW=Math.max(24,Math.hypot(p(454).x-p(234).x,p(454).y-p(234).y));
    const data=ctx.getImageData(0,0,width,height),d=data.data;
    const zones=[
      {x:(L0.x+L1.x)/2,y:(L0.y+L1.y)/2,rx:faceW*.13,ry:faceW*.075},
      {x:(R0.x+R1.x)/2,y:(R0.y+R1.y)/2,rx:faceW*.13,ry:faceW*.075}
    ];
    for(const z of zones){
      const extent=Math.max(z.rx,z.ry*1.85);
      const x0=Math.max(0,Math.floor(z.x-extent)),x1=Math.min(width-1,Math.ceil(z.x+extent));
      const y0=Math.max(0,Math.floor(z.y-extent)),y1=Math.min(height-1,Math.ceil(z.y+extent));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const dx=x-z.x,dy=y-z.y,nx=(dx*ux+dy*uy)/z.rx,ny=(dx*vx+dy*vy)/z.ry;
        let q=nx*nx+ny*ny;
        if(q>=1.8)continue;
        const fall=Math.max(0,1-q/1.8);
        const under=Math.max(0,Math.min(1,ny/.9));
        const brighten=eyeBright*fall*(1-under*.55)*.045;
        const correct=dark*fall*under*.06;
        const i=(y*width+x)*4;
        const lift=brighten+correct;
        d[i]=Math.min(255,d[i]+(255-d[i])*lift);
        d[i+1]=Math.min(255,d[i+1]+(255-d[i+1])*lift+correct*4);
        d[i+2]=Math.min(255,d[i+2]+(255-d[i+2])*lift+correct*7);
      }
    }
    ctx.putImageData(data,0,0);
  }
  function makeupBeauty(width,height){
    if(!face||!settings.enabled||!settings.makeup_enabled)return;
    const g=geometry(width,height);if(!g)return;
    const {p,angle}=g;
    const faceW=Math.max(24,Math.hypot(p(454).x-p(234).x,p(454).y-p(234).y));
    ctx.save();
    // Natural blush follows cheek landmarks.
    for(const id of [50,280]){
      const q=p(id),g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,faceW*.16);
      g.addColorStop(0,"rgba(255,92,112,.10)");g.addColorStop(1,"rgba(255,92,112,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,faceW*.16,faceW*.10,angle,0,Math.PI*2);ctx.fill();
    }
    // Soft lip tint clipped to landmark lip polygon.
    const lip=[61,40,37,0,267,270,291,321,314,17,84,91].map(p);
    ctx.fillStyle="rgba(210,48,82,.14)";ctx.beginPath();ctx.moveTo(lip[0].x,lip[0].y);for(let i=1;i<lip.length;i++)ctx.lineTo(lip[i].x,lip[i].y);ctx.closePath();
    // Leave mouth interior/teeth untouched when the lips part.
    const inner=[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191].map(p);
    ctx.moveTo(inner[0].x,inner[0].y);for(let i=1;i<inner.length;i++)ctx.lineTo(inner[i].x,inner[i].y);ctx.closePath();ctx.fill("evenodd");
    ctx.restore();
  }
  function portraitBlur(width,height){
    const amount=Math.max(0,Math.min(1,(+settings.background_blur||0)/100));
    if(!amount)return;
    if(!segmenter){void loadSegmenter();return;}
    if(performance.now()-lastSegment>100 && video.currentTime!==lastSegmentVideoTime){
      lastSegment=performance.now();
      lastSegmentVideoTime=video.currentTime;
      let result;
      try{
        result=segmenter.segmentForVideo(video,lastSegment);
        const m=result.categoryMask;
        if(m){const raw=m.getAsUint8Array();personMask={data:new Uint8Array(raw),w:m.width,h:m.height};}else personMask=null;
        segmentationError="";
      }catch(e){personMask=null;segmentationError=e?.message||String(e);}
      finally{if(result)result.close();}
    }
    if(!personMask)return;
    const original=portraitBlur._o||(portraitBlur._o=document.createElement("canvas")),oc=original.getContext("2d");
    const blurred=portraitBlur._b||(portraitBlur._b=document.createElement("canvas")),bc=blurred.getContext("2d");
    const mask=portraitBlur._m||(portraitBlur._m=document.createElement("canvas")),mc=mask.getContext("2d");
    for(const surface of [original,blurred,mask]){if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;}}
    oc.clearRect(0,0,width,height);bc.clearRect(0,0,width,height);mc.clearRect(0,0,width,height);
    oc.drawImage(canvas,0,0);
    bc.globalCompositeOperation="source-over";
    blur.draw(original,bc,1+amount*6,width,height);
    const small=portraitBlur._s||(portraitBlur._s=document.createElement("canvas")),sc=small.getContext("2d");
    if(small.width!==personMask.w||small.height!==personMask.h){small.width=personMask.w;small.height=personMask.h;}
    const img=sc.createImageData(personMask.w,personMask.h);
    // SelfieSegmenter categories: 0 background, 1 person.
    for(let i=0;i<personMask.data.length;i++){const v=personMask.data[i]===1?255:0,j=i*4;img.data[j]=img.data[j+1]=img.data[j+2]=255;img.data[j+3]=v}
    sc.putImageData(img,0,0);blur.draw(small,mc,4,width,height);
    oc.globalCompositeOperation="destination-in";oc.drawImage(mask,0,0);oc.globalCompositeOperation="source-over";
    ctx.drawImage(blurred,0,0);ctx.drawImage(original,0,0);
  }
  function render() {
    if (!active) return;
    const renderStart=performance.now();
    const w = video.videoWidth, h = video.videoHeight;
    if((renderStart-lastRenderTime<1000/targetFps)||(!dirty&&video.currentTime===lastRenderedVideoTime)){frame=requestAnimationFrame(render);return;}
    if (w && h && video.readyState >= 2) {
      lastRenderTime=renderStart;lastRenderedVideoTime=video.currentTime;dirty=false;warpedPixels=0;
      const width = Math.min(w, qualityWidth), height = Math.max(1, Math.round(h * width / w));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = softCanvas.width = skinCanvas.width = featherCanvas.width = width;
        canvas.height = softCanvas.height = skinCanvas.height = featherCanvas.height = height;
      }
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, width, height);
      if (tracker && performance.now()-lastDetect>180 && video.currentTime!==lastDetectVideoTime) {
        lastDetect=performance.now();
        lastDetectVideoTime=video.currentTime;
        videoTime=video.currentTime;
        try{
          const detected=tracker.detectForVideo(video,lastDetect).faceLandmarks?.[0]||null;
          if(detected&&detected.length>=468&&detected.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y))){
            const span=Math.max(.05,Math.hypot(detected[454].x-detected[234].x,detected[454].y-detected[234].y));
            const jump=stableFace?Math.hypot(detected[1].x-stableFace[1].x,detected[1].y-stableFace[1].y):Infinity;
            // A stationary nose does not imply a stationary face: scale and roll
            // changes must reset the old contour instead of averaging two poses.
            const axis=points=>({x:(points[454].x-points[234].x)*width,y:(points[454].y-points[234].y)*height});
            const current=axis(detected),previous=stableFace?axis(stableFace):current;
            const size=Math.hypot(current.x,current.y),oldSize=Math.hypot(previous.x,previous.y);
            const roll=Math.abs(Math.atan2(current.x*previous.y-current.y*previous.x,current.x*previous.x+current.y*previous.y));
            const poseChanged=oldSize>0&&(Math.abs(size/oldSize-1)>.08||roll>Math.PI/15);
            if(!stableFace||stableFace.length!==detected.length||jump>span*.25||poseChanged)stableFace=detected.map(q=>({...q}));
            else{
              // Follow motion promptly; retain stronger stabilization for tiny tracking noise.
              const alpha=Math.min(.88,.58+jump/span*1.5);
              for(let i=0;i<detected.length;i++){
                // Mouth/eye motion can change while the nose remains still.
                const motion=Math.hypot(detected[i].x-stableFace[i].x,detected[i].y-stableFace[i].y);
                const follow=motion>span*.025?1:alpha;
                stableFace[i].x+=follow*(detected[i].x-stableFace[i].x);stableFace[i].y+=follow*(detected[i].y-stableFace[i].y);
                stableFace[i].z+=follow*((detected[i].z||0)-(stableFace[i].z||0));
              }
            }
            face=stableFace;
          }else{face=null;stableFace=null;}
        }catch(error){face=null;stableFace=null;console.warn("Mimo face detection error:",error);}

      }
      if (settings.enabled) {
        try{
        warpFace(width,height);
        regionalBeauty(width,height);
        makeupBeauty(width,height);
        smoothSkin(width,height);
        const white = Math.max(0, Math.min(100, Number(settings.whitening))) / 100;
        const rosy = Math.max(0, Math.min(100, Number(settings.rosy))) / 100;
        if (white || rosy) {
          const frameData = ctx.getImageData(0, 0, width, height);
          const d = frameData.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.min(255, d[i] + (255 - d[i]) * white * 0.17 + rosy * 9);
            d[i+1] = Math.min(255, d[i+1] + (255 - d[i+1]) * white * 0.17);
            d[i+2] = Math.min(255, d[i+2] + (255 - d[i+2]) * white * 0.17 + rosy * 4);
          }
          ctx.putImageData(frameData, 0, 0);
        }
        portraitBlur(width,height);
        processingError="";
        }catch(error){
          processingError=error?.message||String(error);
          // Keep the independent preview usable if a device rejects an effect operation.
          ctx.filter="none";ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
          ctx.drawImage(video,0,0,width,height);
        }
      }
    }
    const cost=performance.now()-renderStart;
    renderSamples.push(cost);if(renderSamples.length>30)renderSamples.shift();
    if(performance.now()-lastQualityCheck>3500&&renderSamples.length>=20){
      lastQualityCheck=performance.now();
      const avg=renderSamples.reduce((a,b)=>a+b,0)/renderSamples.length;
      const target=avg>38?360:avg<24?480:qualityWidth;
      if(target!==qualityWidth){qualityWidth=target;renderSamples.length=0;}
    }
    frame = requestAnimationFrame(render);
  }
  return {
    canvas,
    getTrackingStatus(){return trackingStatus;},
    getTrackingError(){return trackingError;},
    getFaceDetected(){return !!face;},
    getDebug(){return {version:"2.7.2",trackingStatus,segmentationStatus,segmentationError,processingError,blurMaskReady:!!personMask,canvasFilterSupported:blur.native,blurBackend:blur.native?"native":"cpu",warpedPixels,targetFps,faceDetected:!!face,landmarkCount:face?.length||0,videoTime,slimFace:+settings.slim_face||0,bigEyes:+settings.big_eyes||0,qualityWidth,avgFrameMs:renderSamples.length?Math.round(renderSamples.reduce((a,b)=>a+b,0)/renderSamples.length):0};},
    start(fps = 24) {
      if(disposed)throw new Error("Beauty engine disposed");
      targetFps=Math.max(1,Math.min(30,Number(fps)||24));
      if (!stream) stream = canvas.captureStream(targetFps);
      if (!active) { active = true;dirty=true;lastRenderTime=-Infinity; render(); }
      return stream;
    },
    update(patch) { settings = { ...settings, ...patch }; dirty=true; },
    stop() {
      active = false;
      cancelAnimationFrame(frame);
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null;
    },
    dispose(){
      this.stop();disposed=true;
      tracker?.close();segmenter?.close();tracker=null;segmenter=null;face=null;stableFace=null;personMask=null;
      visionLibrary=null;visionFiles=null;
    }
  };
}
