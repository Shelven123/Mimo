/* Mimo preview blur: native filter when pixel-proven, bounded CPU fallback otherwise. */
export function createBeautyBlur(makeCanvas = () => document.createElement("canvas")) {
  const probe = makeCanvas(), probeCtx = probe.getContext("2d", {willReadFrequently:true});
  probe.width=probe.height=9;
  let native=false;
  if(probeCtx && "filter" in probeCtx){
    probeCtx.fillStyle="#fff";probeCtx.fillRect(4,4,1,1);
    const output=makeCanvas();output.width=output.height=9;
    const c=output.getContext("2d", {willReadFrequently:true});
    c.filter="blur(1px)";c.drawImage(probe,0,0);
    native=c.getImageData(3,4,1,1).data[3]>0;
  }
  const buffers=new WeakMap();
  function boxPass(input,output,w,h,r,horizontal){
    const length=horizontal?w:h,lines=horizontal?h:w,step=horizontal?4:w*4,window=r*2+1;
    for(let line=0;line<lines;line++){
      const base=horizontal?line*w*4:line*4;
      for(let channel=0;channel<4;channel++){
        let sum=0;
        for(let i=-r;i<=r;i++)sum+=input[base+Math.max(0,Math.min(length-1,i))*step+channel];
        for(let i=0;i<length;i++){
          output[base+i*step+channel]=sum/window;
          sum+=input[base+Math.min(length-1,i+r+1)*step+channel]-input[base+Math.max(0,i-r)*step+channel];
        }
      }
    }
  }
  return {
    native,
    draw(source,target,radius,width=source.width,height=source.height){
      target.clearRect(0,0,width,height);
      if(native){target.filter=`blur(${radius}px)`;target.drawImage(source,0,0,width,height);target.filter="none";return;}
      let buffer=buffers.get(target);
      if(!buffer){const small=makeCanvas();buffer={small,sc:small.getContext("2d",{willReadFrequently:true}),work:null};buffers.set(target,buffer);}
      const {small,sc}=buffer;
      // Safari fallback: at most 240 px wide, sliding-window blur, premultiplied alpha.
      const scale=Math.min(1,240/width),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
      if(small.width!==w||small.height!==h){small.width=w;small.height=h;}
      sc.clearRect(0,0,w,h);sc.drawImage(source,0,0,w,h);
      const image=sc.getImageData(0,0,w,h),d=image.data;
      if(!buffer.work||buffer.work.length!==d.length)buffer.work=new Float32Array(d.length);
      const work=buffer.work;
      for(let i=0;i<d.length;i+=4){const alpha=d[i+3]/255;d[i]*=alpha;d[i+1]*=alpha;d[i+2]*=alpha;}
      const r=Math.max(1,Math.min(24,Math.round(radius*scale)));
      boxPass(d,work,w,h,r,true);boxPass(work,d,w,h,r,false);
      for(let i=0;i<d.length;i+=4){const alpha=d[i+3]/255;if(alpha){d[i]/=alpha;d[i+1]/=alpha;d[i+2]/=alpha;}}
      sc.putImageData(image,0,0);target.drawImage(small,0,0,width,height);
    }
  };
}
