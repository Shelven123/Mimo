/* Mimo Beauty Engine v2.4 — landmark-aware reshape + protected skin/eye/makeup + portrait blur. */
export function createBeautyEngine(video, options = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx || !canvas.captureStream) throw new Error("Canvas video processing unavailable");
  let settings = { smoothing: 0, whitening: 0, rosy: 0, slim_face: 0, big_eyes: 0, chin: 0, nose: 0, eye_brightening: 0, dark_circle: 0, background_blur: 0, enabled: true, ...options };
  let active = false, frame = 0, stream = null;
  const softCanvas = document.createElement("canvas");
  const softCtx = softCanvas.getContext("2d");
  if (!softCtx) throw new Error("Canvas smoothing unavailable");

  let tracker = null, face = null, trackingStatus = "loading", lastDetect = 0, videoTime = -1, trackingError = "";
  let segmenter=null, personMask=null, segmentationStatus="idle", lastSegment=0;
  (async () => {
    const model = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
    const versions = ["0.10.14", "0.10.3"];
    for (const version of versions) {
      try {
        trackingStatus = "loading";
        const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + version;
        const lib = await import(base + "/vision_bundle.mjs");
        const vision = await lib.FilesetResolver.forVisionTasks(base + "/wasm");
        tracker = await lib.FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: model, delegate: "CPU" },
          runningMode: "VIDEO", numFaces: 1
        });
        trackingStatus = "ready";
        trackingError = "";
        // Load portrait segmentation independently; Beauty still works if this optional model is unavailable.
        try {
          segmentationStatus="loading";
          const segModel="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task";
          segmenter=await lib.ImageSegmenter.createFromOptions(vision,{baseOptions:{modelAssetPath:segModel,delegate:"CPU"},runningMode:"VIDEO",outputCategoryMask:true,outputConfidenceMasks:false});
          segmentationStatus="ready";
        } catch(segError){segmentationStatus="unavailable";console.warn("Mimo portrait segmentation unavailable",segError)}
        return;
      } catch (error) {
        trackingError = version + ": " + (error?.message || String(error));
        console.warn("Mimo FaceLandmarker failed", trackingError);
      }
    }
    trackingStatus = "unavailable";
  })();
  function warpFace(width, height) {
    if (!face || !settings.enabled) return;
    const amount = name => Math.max(0, Math.min(1, (+settings[name] || 0) / 100));
    const slim=amount("slim_face"), eyes=amount("big_eyes"), chin=amount("chin"), nose=amount("nose");
    if (!slim && !eyes && !chin && !nose) return;
    const p=id=>({x:face[id].x*width,y:face[id].y*height});
    const L=p(234),R=p(454),C=p(1),J=p(152),T=p(10);
    const faceW=Math.hypot(R.x-L.x,R.y-L.y);
    if(faceW<28)return;
    const src=ctx.getImageData(0,0,width,height), dst=ctx.createImageData(width,height);
    const s=src.data,d=dst.data; d.set(s);
    const zones=[];
    const add=(pt,rx,ry,dx,dy,power)=>{if(power>0)zones.push({x:pt.x,y:pt.y,rx,ry,dx,dy,power})};
    // Contour-aware slimming: pull jaw/cheek source outward so rendered contour moves inward.
    const leftIds=[132,58,172,136,150], rightIds=[361,288,397,365,379];
    leftIds.forEach((id,i)=>add(p(id),faceW*.20,faceW*.25,-faceW*(.018+.018*i)*slim,0,1));
    rightIds.forEach((id,i)=>add(p(id),faceW*.20,faceW*.25, faceW*(.018+.018*i)*slim,0,1));
    // Chin: lengthen only the lower tip, preserving mouth.
    add(J,faceW*.24,faceW*.20,0,-faceW*.075*chin,1);
    // Eyes: local radial magnification centered on iris/eye regions.
    const eyeZones=[[33,133],[263,362]];
    for(const [outer,inner] of eyeZones){const a=p(outer),b=p(inner),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};add(m,faceW*.16,faceW*.12,0,0,eyes*.75)}
    // Nose: narrow around alae, not the whole mid-face.
    add(p(98),faceW*.12,faceW*.14,-faceW*.035*nose,0,1);
    add(p(327),faceW*.12,faceW*.14, faceW*.035*nose,0,1);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      let sx=x,sy=y,hit=false;
      for(const z of zones){
        const nx=(x-z.x)/z.rx,ny=(y-z.y)/z.ry,q=nx*nx+ny*ny;
        if(q>=1)continue;
        const fall=(1-q)*(1-q)*z.power;
        if(z.dx||z.dy){sx+=z.dx*fall;sy+=z.dy*fall}
        else if(eyes){
          const k=1-Math.min(.20,eyes*.16)*fall;
          sx=z.x+(sx-z.x)*k; sy=z.y+(sy-z.y)*k;
        }
        hit=true;
      }
      if(!hit)continue;
      sx=Math.max(0,Math.min(width-1,sx));sy=Math.max(0,Math.min(height-1,sy));
      const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0,to=(y*width+x)*4;
      const i00=(y0*width+x0)*4,i10=(y0*width+x1)*4,i01=(y1*width+x0)*4,i11=(y1*width+x1)*4;
      for(let k=0;k<3;k++)d[to+k]=s[i00+k]*(1-fx)*(1-fy)+s[i10+k]*fx*(1-fy)+s[i01+k]*(1-fx)*fy+s[i11+k]*fx*fy;
    }
    ctx.putImageData(dst,0,0);
  }
  function regionalBeauty(width,height){
    if(!face||!settings.enabled)return;
    const eyeBright=Math.max(0,Math.min(1,(+settings.eye_brightening||0)/100));
    const dark=Math.max(0,Math.min(1,(+settings.dark_circle||0)/100));
    if(!eyeBright&&!dark)return;
    const p=id=>({x:face[id].x*width,y:face[id].y*height});
    const L0=p(33),L1=p(133),R0=p(263),R1=p(362);
    const faceW=Math.max(24,Math.hypot(p(454).x-p(234).x,p(454).y-p(234).y));
    const data=ctx.getImageData(0,0,width,height),d=data.data;
    const zones=[
      {x:(L0.x+L1.x)/2,y:(L0.y+L1.y)/2,rx:faceW*.13,ry:faceW*.075},
      {x:(R0.x+R1.x)/2,y:(R0.y+R1.y)/2,rx:faceW*.13,ry:faceW*.075}
    ];
    for(const z of zones){
      const x0=Math.max(0,Math.floor(z.x-z.rx)),x1=Math.min(width-1,Math.ceil(z.x+z.rx));
      const y0=Math.max(0,Math.floor(z.y-z.ry*.65)),y1=Math.min(height-1,Math.ceil(z.y+z.ry*1.85));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const nx=(x-z.x)/z.rx, ny=(y-z.y)/z.ry;
        let q=nx*nx+ny*ny;
        if(q>=1.8)continue;
        const fall=Math.max(0,1-q/1.8);
        const under=Math.max(0,Math.min(1,(y-z.y)/(z.ry*.9)));
        const brighten=eyeBright*fall*(1-under*.55)*.12;
        const correct=dark*fall*under*.16;
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
    const p=id=>({x:face[id].x*width,y:face[id].y*height});
    const faceW=Math.max(24,Math.hypot(p(454).x-p(234).x,p(454).y-p(234).y));
    ctx.save();
    // Natural blush follows cheek landmarks.
    for(const id of [50,280]){
      const q=p(id),g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,faceW*.16);
      g.addColorStop(0,"rgba(255,92,112,.10)");g.addColorStop(1,"rgba(255,92,112,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,faceW*.16,faceW*.10,0,0,Math.PI*2);ctx.fill();
    }
    // Soft lip tint clipped to landmark lip polygon.
    const lip=[61,40,37,0,267,270,291,321,314,17,84,91].map(p);
    ctx.fillStyle="rgba(210,48,82,.14)";ctx.beginPath();ctx.moveTo(lip[0].x,lip[0].y);for(let i=1;i<lip.length;i++)ctx.lineTo(lip[i].x,lip[i].y);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function portraitBlur(width,height){
    const amount=Math.max(0,Math.min(1,(+settings.background_blur||0)/100));
    if(!amount||!segmenter)return;
    if(performance.now()-lastSegment>260){
      lastSegment=performance.now();
      try{
        const r=segmenter.segmentForVideo(video,Math.round(video.currentTime*1000));
        const m=r.categoryMask;
        if(m){const raw=m.getAsUint8Array();personMask={data:new Uint8Array(raw),w:m.width,h:m.height};}
        if(r.close)r.close();
      }catch(e){console.warn("Mimo segmentation frame error",e)}
    }
    if(!personMask)return;
    const original=document.createElement("canvas"),oc=original.getContext("2d");
    const blurred=document.createElement("canvas"),bc=blurred.getContext("2d");
    const mask=document.createElement("canvas"),mc=mask.getContext("2d");
    original.width=blurred.width=mask.width=width;original.height=blurred.height=mask.height=height;
    oc.drawImage(canvas,0,0);
    bc.filter="blur("+(3+amount*11).toFixed(1)+"px)";bc.drawImage(original,0,0);
    const small=document.createElement("canvas"),sc=small.getContext("2d");
    small.width=personMask.w;small.height=personMask.h;
    const img=sc.createImageData(personMask.w,personMask.h);
    for(let i=0;i<personMask.data.length;i++){const v=personMask.data[i]===0?255:0,j=i*4;img.data[j]=img.data[j+1]=img.data[j+2]=255;img.data[j+3]=v}
    sc.putImageData(img,0,0);mc.filter="blur(4px)";mc.drawImage(small,0,0,width,height);
    bc.globalCompositeOperation="destination-out";bc.drawImage(mask,0,0);
    ctx.drawImage(blurred,0,0);ctx.drawImage(original,0,0);
  }
  function render() {
    if (!active) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (w && h && video.readyState >= 2) {
      const width = Math.min(w, 480), height = Math.max(1, Math.round(h * width / w));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = softCanvas.width = width;
        canvas.height = softCanvas.height = height;
      }
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, width, height);
      if (tracker && performance.now()-lastDetect>180) {
        lastDetect=performance.now();
        videoTime=video.currentTime;
        try { face=tracker.detectForVideo(video,Math.round(video.currentTime*1000)).faceLandmarks?.[0] || null; }
        catch (error) { face=null; console.warn("Mimo face detection error:",error); }
      }
      if (settings.enabled) {
        warpFace(width,height);
        regionalBeauty(width,height);
        makeupBeauty(width,height);
        portraitBlur(width,height);
        // Face reshaping controls are intentionally not approximated with fixed
        // screen regions. That produced visible oval seams and rectangular eye
        // artifacts when the face moved. Proper landmark-based warping will be
        // used for these controls.
        const smooth = Math.min(0.48, Math.max(0, Number(settings.smoothing) / 100 * 0.48));
        if (smooth) {
          softCtx.clearRect(0, 0, width, height);
          softCtx.filter = "blur(" + (0.7 + smooth * 4).toFixed(2) + "px)";
          softCtx.drawImage(canvas, 0, 0);
          ctx.globalAlpha = smooth;
          ctx.drawImage(softCanvas, 0, 0);
          ctx.globalAlpha = 1;
          // Restore key facial features after smoothing so eyes, brows, nose and lips keep detail.
          if(face){
            const fp=id=>({x:face[id].x*width,y:face[id].y*height});
            const fw=Math.max(24,Math.hypot(fp(454).x-fp(234).x,fp(454).y-fp(234).y));
            const restore=(pt,rx,ry,a=.78)=>{ctx.save();ctx.beginPath();ctx.ellipse(pt.x,pt.y,rx,ry,0,0,Math.PI*2);ctx.clip();ctx.globalAlpha=a;ctx.drawImage(video,0,0,width,height);ctx.restore()};
            const le0=fp(33),le1=fp(133),re0=fp(263),re1=fp(362);
            restore({x:(le0.x+le1.x)/2,y:(le0.y+le1.y)/2},fw*.15,fw*.10);
            restore({x:(re0.x+re1.x)/2,y:(re0.y+re1.y)/2},fw*.15,fw*.10);
            restore(fp(1),fw*.12,fw*.18,.58);
            restore(fp(13),fw*.18,fw*.10,.70);
          }
        }
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
      }
    }
    frame = requestAnimationFrame(render);
  }
  return {
    canvas,
    getTrackingStatus(){return trackingStatus;},
    getTrackingError(){return trackingError;},
    getFaceDetected(){return !!face;},
    getDebug(){return {trackingStatus,segmentationStatus,faceDetected:!!face,landmarkCount:face?.length||0,videoTime,slimFace:+settings.slim_face||0,bigEyes:+settings.big_eyes||0};},
    start(fps = 24) {
      if (!stream) stream = canvas.captureStream(fps);
      if (!active) { active = true; render(); }
      return stream;
    },
    update(patch) { settings = { ...settings, ...patch }; },
    stop() {
      active = false;
      cancelAnimationFrame(frame);
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  };
}
