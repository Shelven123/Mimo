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
