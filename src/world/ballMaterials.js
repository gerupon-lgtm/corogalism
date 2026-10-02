import {CHARACTERS} from './characters.js';
import {BALL_LAB_BOUNCE} from '../config/gameConfig.js';

/** 本編採用前の試遊値。同じ直径で動きと音を比較する。 */
export const BALL_MATERIALS={
 metal:{...CHARACTERS.default,id:'metal',name:'金属',appearance:'metal',accelK:.35,frictionK:.18,restitutionK:1.25,fieldK:.55,maxSpeed:6.8,hint:'じわっと動き、勢いが長く残る。止めるなら早めに逆へ。'},
 superball:{...CHARACTERS.default,id:'superball',name:'スーパーボール',appearance:'superball',accelK:1.05,frictionK:.08,restitutionK:2.7,fieldK:1.6,restitutionLimit:.94,maxSpeed:8.5,hint:'勢いよく跳ね、弱い跳ね返りはだんだん収まる。'},
 wood:{...CHARACTERS.default,id:'wood',name:'木',appearance:'wood',accelK:.95,frictionK:.9,restitutionK:.7,fieldK:1,maxSpeed:6,hint:'なめらかに転がり、少し余韻を残して止まる。'},
 sponge:{...CHARACTERS.default,id:'sponge',name:'スポンジ',appearance:'sponge',accelK:1.15,frictionK:1.6,restitutionK:.08,fieldK:1.5,maxSpeed:4.5,hint:'軽い反応と短い余韻。壁の衝撃をやわらかく吸収。'},
 default:{...CHARACTERS.default,name:'ビー玉',appearance:'pearl',hint:'いつもの転がり方。素材の違いをくらべる基準。'},
};
for(const [id,bounce]of Object.entries(BALL_LAB_BOUNCE))BALL_MATERIALS[id].bounce=bounce;
export function getBallMaterial(id){return BALL_MATERIALS[id]||BALL_MATERIALS.metal;}
