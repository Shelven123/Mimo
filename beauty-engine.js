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
  function render() {
    if (!active) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (w && h && video.readyState >= 2) {
      const width = Math.min(w, 640), height = Math.max(1, Math.round(h * width / w));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = softCanvas.width = width;
        canvas.height = softCanvas.height = height;
      }
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, width, height);
      if (settings.enabled) {
        // Lightweight geometry stage. This runs without a paid SDK and gives
        // immediate face-proportion feedback while landmark tracking is added.
        // It intentionally affects only the central portrait region.
        const slim = Math.max(0, Math.min(100, Number(settings.slim_face))) / 100;
        const chin = Math.max(0, Math.min(100, Number(settings.chin))) / 100;
        const nose = Math.max(0, Math.min(100, Number(settings.nose))) / 100;
        if (slim || chin || nose) {
          softCtx.filter = "none";
          softCtx.clearRect(0, 0, width, height);
          softCtx.drawImage(canvas, 0, 0);
          const cx = width * .5, cy = height * .43;
          const rw = width * .42, rh = height * .52;
          const sx = cx - rw / 2, sy = cy - rh / 2;
          const squeeze = 1 - slim * .10 - nose * .025;
          const stretch = 1 + chin * .045;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(cx, cy, rw * .5, rh * .5, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.clearRect(sx, sy, rw, rh);
          ctx.drawImage(softCanvas, sx, sy, rw, rh,
            cx - rw * squeeze / 2, cy - rh * stretch / 2,
            rw * squeeze, rh * stretch);
          ctx.restore();
        }
        const eyes = Math.max(0, Math.min(100, Number(settings.big_eyes))) / 100;
        const brightEyes = Math.max(0, Math.min(100, Number(settings.eye_brightening))) / 100;
        if (eyes || brightEyes) {
          softCtx.filter = "none";
          softCtx.clearRect(0, 0, width, height);
          softCtx.drawImage(canvas, 0, 0);
          const ey = height * .38, ew = width * .13, eh = height * .075;
          [width * .39, width * .61].forEach(ex => {
            const scale = 1 + eyes * .16;
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(ex, ey, ew * .72, eh * .72, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.filter = brightEyes ? "brightness(" + (1 + brightEyes * .22) + ")" : "none";
            ctx.drawImage(softCanvas, ex-ew/2, ey-eh/2, ew, eh,
              ex-ew*scale/2, ey-eh*scale/2, ew*scale, eh*scale);
            ctx.restore();
          });
          ctx.filter = "none";
        }
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
