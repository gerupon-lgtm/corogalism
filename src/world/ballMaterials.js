import {CHARACTERS} from './characters.js';

/** 本編採用前の試遊値。同じ直径で動きと音を比較する。 */
export const BALL_MATERIALS={
 metal:{...CHARACTERS.default,id:'metal',name:'金属',appearance:'metal',accelK:.35,frictionK:.18,restitutionK:1.25,fieldK:.55,maxSpeed:6.8,hint:'じわっと動き、勢いが長く残る。止めるなら早めに逆へ。'},
 superball:{...CHARACTERS.default,id:'superball',name:'スーパーボール',appearance:'superball',accelK:1.05,frictionK:.12,restitutionK:2.7,fieldK:1.6,restitutionLimit:.94,maxSpeed:8.5,hint:'壁から大きく跳ね返る。力場と組み合わせて跳ね回ろう。'},
 wood:{...CHARACTERS.default,id:'wood',name:'木',appearance:'wood',accelK:1.1,frictionK:1.35,restitutionK:.9,fieldK:1,maxSpeed:6,hint:'動きも止まり方も素直。ほかの素材との比較役。'},
 sponge:{...CHARACTERS.default,id:'sponge',name:'スポンジ',appearance:'sponge',accelK:1.55,frictionK:2.8,restitutionK:.18,fieldK:2.5,maxSpeed:4.5,hint:'軽く動き出し、すぐ止まる。壁では勢いをやわらかく吸収。'},
 default:{...CHARACTERS.default,name:'ビー玉',appearance:'pearl',hint:'いつもの転がり方。素材の違いをくらべる基準。'},
};
export function getBallMaterial(id){return BALL_MATERIALS[id]||BALL_MATERIALS.metal;}
