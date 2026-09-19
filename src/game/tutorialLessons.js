/** 未読の接触説明を順番に保持する。DOMに依存しない。 */
export function createLessonQueue() {
 const seen=new Set(),pending=[];
 return {
  reset(){seen.clear();pending.length=0;},
  contact(id){if(!seen.has(id)&&!pending.includes(id))pending.push(id);},
  next(){const id=pending.shift();if(id)seen.add(id);return id;},
 };
}
