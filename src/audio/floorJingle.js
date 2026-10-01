/** 小さな木琴とベルの音。ファイルの読込を待たず、開始待ち時間へ収める。 */
export function createFloorJingle(context,special=false){
 const seconds=.72,rate=context.sampleRate,buffer=context.createBuffer(1,Math.ceil(rate*seconds),rate);
 const data=buffer.getChannelData(0),notes=special?[659.25,783.99,987.77,1318.51]:[523.25,659.25,783.99];
 for(let i=0;i<data.length;i++){
  const t=i/rate;let value=0;
  notes.forEach((hz,n)=>{const age=t-n*.115;if(age<0)return;
   const envelope=Math.min(1,age/.008)*Math.exp(-age*11)*Math.min(1,(seconds-t)/.04);
   value+=envelope*(Math.sin(2*Math.PI*hz*age)+.24*Math.sin(2*Math.PI*hz*2.01*age))*.14;
  });data[i]=value;
 }
 return buffer;
}
