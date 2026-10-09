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

  let tracker = null, face = null, trackingStatus = "loading", lastDetect = 0, videoTime = -1, trackingError = "";
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
    const slim = amount("slim_face"), eyes = amount("big_eyes");
    const chin = amount("chin"), nose = amount("nose");
    if (!slim && !eyes && !chin && !nose) return;
    const p = id => ({ x: face[id].x * width, y: face[id].y * height });
    const left = p(234), right = p(454), jaw = p(152);
    const faceSize = Math.hypot(right.x-left.x, right.y-left.y);
    if (faceSize < 28) return;
    // Face slimming: inverse-map pixels toward the original outer cheek.
    // Only horizontal cheek compression is used here; the previous radial
    // point-pull distorted the mouth/chin and made the lower face balloon.
    if (slim) {
      const src = ctx.getImageData(0,0,width,height);
      const dst = ctx.createImageData(width,height);
      const a=src.data,b=dst.data; b.set(a);
      const center=p(1), top=p(10), bottom=p(152);
      const half=Math.max(20,Math.abs(right.x-left.x)*0.56);
      const yTop=top.y+faceSize*.18, yBottom=bottom.y+faceSize*.04;
      const strength=0.22*slim;
      for(let y=Math.max(0,Math.floor(yTop));y<Math.min(height,Math.ceil(yBottom));y++){
        const yn=(y-(yTop+yBottom)/2)/Math.max(1,(yBottom-yTop)/2);
        const vertical=Math.max(0,1-yn*yn);
        for(let x=Math.max(0,Math.floor(center.x-half));x<Math.min(width,Math.ceil(center.x+half));x++){
          const dx=x-center.x, nx=Math.abs(dx)/half;
          if(nx>=1)continue;
          const edge=nx*nx*(3-2*nx);
          const sx=center.x+dx*(1+strength*vertical*(1-edge));
          const sy=y;
          const xx=Math.max(0,Math.min(width-1,sx)), x0=Math.floor(xx), x1=Math.min(width-1,x0+1), fx=xx-x0, to=(y*width+x)*4;
          const a0=(y*width+x0)*4,a1=(y*width+x1)*4;
          for(let k=0;k<3;k++)b[to+k]=a[a0+k]*(1-fx)+a[a1+k]*fx;
        }
      }
      ctx.putImageData(dst,0,0);
    }
    // Other landmark reshapes stay disabled until each deformation is tuned
    // independently; they must not contaminate the verified Slim Face path.
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
        videoTime=video.currentTime;
        try { face=tracker.detectForVideo(video,Math.round(video.currentTime*1000)).faceLandmarks?.[0] || null; }
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
    getTrackingError(){return trackingError;},
    getFaceDetected(){return !!face;},
    getDebug(){return {trackingStatus,faceDetected:!!face,landmarkCount:face?.length||0,videoTime,slimFace:+settings.slim_face||0,bigEyes:+settings.big_eyes||0};},
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
