/* Mimo Beauty Engine v0.1 — real canvas pixel processing, no CSS-only effects. */
export function createBeautyEngine(video, options = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx || !canvas.captureStream) throw new Error("Canvas video processing unavailable");
  let settings = { smoothing: 0, whitening: 0, rosy: 0, slim_face: 0, big_eyes: 0, chin: 0, nose: 0, eye_brightening: 0, dark_circle: 0, background_blur: 0, enabled: true, ...options };
  let active = false, frame = 0, stream = null;
  const softCanvas = document.createElement("canvas");
  const softCtx = softCanvas.getContext("2d");
  if (!softCtx) throw new Error("Canvas smoothing unavailable");

  let tracker = null, face = null, trackingStatus = "loading", lastDetect = 0;
  (async () => {
    try {
      const lib = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm");
      const vision = await lib.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
      tracker = await lib.FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "CPU" },
        runningMode: "VIDEO", numFaces: 1
      });
      trackingStatus = "ready";
    } catch (error) {
      trackingStatus = "unavailable";
      console.warn("Mimo face tracking unavailable:", error);
    }
  })();
  function warpFace(width, height) {
    if (!face || !settings.enabled) return;
    const amount = name => Math.max(0, Math.min(1, (+settings[name] || 0) / 100));
    const slim = amount("slim_face"), eyes = amount("big_eyes");
    const chin = amount("chin"), nose = amount("nose");
    if (!slim && !eyes && !chin && !nose) return;
    const p = id => ({ x: face[id].x * width, y: face[id].y * height });
    const left = p(234), right = p(454), jaw = p(152);
    const faceSize = Math.hypot(right.x-left.x, right.y-left.y);
    if (faceSize < 28) return;
    const effects = [];
    function effect(center, radius, power, mode, target) {
      if (power <= 0) return;
      effects.push({ x:center.x, y:center.y, r:radius, power, mode, target });
    }
    effect(p(33), faceSize*.18, eyes*.24, "scale");
    effect(p(263), faceSize*.18, eyes*.24, "scale");
    effect(p(172), faceSize*.32, slim*.42, "move", p(1));\n    effect(p(136), faceSize*.26, slim*.28, "move", p(152));
    effect(p(397), faceSize*.32, slim*.42, "move", p(1));\n    effect(p(365), faceSize*.26, slim*.28, "move", p(152));
    effect(jaw, faceSize*.30, chin*.12, "move", p(13));
    effect(p(1), faceSize*.18, nose*.16, "scale");
    const src = ctx.getImageData(0,0,width,height);
    const dst = ctx.createImageData(width,height);
    const a = src.data, b = dst.data;
    b.set(a);
    for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
      let sx=x,sy=y,activeEffect=false;
      for(const e of effects) {
        const dx=x-e.x,dy=y-e.y,dd=dx*dx+dy*dy;
        if(dd>=e.r*e.r)continue;
        const weight=(1-dd/(e.r*e.r))**2 * e.power;
        if(e.mode==="scale") {
          sx-=dx*weight;
          sy-=dy*weight;
        } else {
          const vx=e.target.x-e.x,vy=e.target.y-e.y;
          const length=Math.hypot(vx,vy)||1;
          sx+=vx/length*e.r*weight;
          sy+=vy/length*e.r*weight;
        }
        activeEffect=true;
      }
      if(!activeEffect)continue;
      sx=Math.max(0,Math.min(width-1,sx));sy=Math.max(0,Math.min(height-1,sy));
      const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1);
      const fx=sx-x0,fy=sy-y0,to=(y*width+x)*4;
      const a00=(y0*width+x0)*4,a10=(y0*width+x1)*4,a01=(y1*width+x0)*4,a11=(y1*width+x1)*4;
      for(let k=0;k<3;k++) b[to+k]=a[a00+k]*(1-fx)*(1-fy)+a[a10+k]*fx*(1-fy)+a[a01+k]*(1-fx)*fy+a[a11+k]*fx*fy;
    }
    ctx.putImageData(dst,0,0);
  }
  function render() {
    if (!active) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (w && h && video.readyState >= 2) {
      const width = Math.min(w, 360), height = Math.max(1, Math.round(h * width / w));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = softCanvas.width = width;
        canvas.height = softCanvas.height = height;
      }
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, width, height);
      if (tracker && performance.now()-lastDetect>180) {
        lastDetect=performance.now();
        try { face=tracker.detectForVideo(video,lastDetect).faceLandmarks?.[0] || null; }
        catch (error) { face=null; console.warn("Mimo face detection error:",error); }
      }
      if (settings.enabled) {
        warpFace(width,height);
        // Face reshaping controls are intentionally not approximated with fixed
        // screen regions. That produced visible oval seams and rectangular eye
        // artifacts when the face moved. Proper landmark-based warping will be
        // used for these controls.
        const smooth = Math.min(0.6, Math.max(0, Number(settings.smoothing) / 100 * 0.6));
        if (smooth) {
          softCtx.clearRect(0, 0, width, height);
          softCtx.filter = "blur(" + (0.7 + smooth * 4).toFixed(2) + "px)";
          softCtx.drawImage(canvas, 0, 0);
          ctx.globalAlpha = smooth;
          ctx.drawImage(softCanvas, 0, 0);
          ctx.globalAlpha = 1;
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
    getFaceDetected(){return !!face;},
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
