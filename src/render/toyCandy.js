/** A案：クリームのねじり包みと、緑の斜め縞を持つ光沢キャンディ。 */
export function drawToyCandy(ctx, x, y, size, now, reducedMotion) {
  ctx.save();
  ctx.translate(x, y + (reducedMotion ? 0 : Math.sin(now / 650) * size * 0.035));
  ctx.scale(size, size);
  const halo = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 1);
  halo.addColorStop(0, '#bcf99538'); halo.addColorStop(1, '#bcf99500');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-0.18);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    const wrap = ctx.createLinearGradient(0, -0.45, 0, 0.45);
    wrap.addColorStop(0, '#fffbe5'); wrap.addColorStop(0.3, '#e4d0a2');
    wrap.addColorStop(0.48, '#fff8df'); wrap.addColorStop(0.8, '#bd9e6b'); wrap.addColorStop(1, '#f7e8bc');
    ctx.fillStyle = wrap; ctx.strokeStyle = '#fff0c8'; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(0.38, 0); ctx.bezierCurveTo(0.53, -0.12, 0.81, -0.49, 0.85, -0.32);
    ctx.bezierCurveTo(0.82, -0.13, 0.73, 0, 0.88, 0.3); ctx.bezierCurveTo(0.8, 0.5, 0.57, 0.15, 0.38, 0);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#9e825966'; ctx.lineWidth = 0.025;
    for (const yy of [-0.2, 0.16]) { ctx.beginPath(); ctx.moveTo(0.45, 0); ctx.lineTo(0.79, yy); ctx.stroke(); }
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, 0.48, 0.46, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#f9edcb'; ctx.fillRect(-0.5, -0.5, 1, 1);
  ctx.rotate(0.45); ctx.fillStyle = '#85b86c';
  for (let n = -2; n <= 2; n++) ctx.fillRect(n * 0.4 - 0.13, -0.8, 0.23, 1.6);
  ctx.rotate(-0.45);
  const shade = ctx.createRadialGradient(-0.18, -0.22, 0.04, 0.06, 0.1, 0.64);
  shade.addColorStop(0, '#ffffff66'); shade.addColorStop(0.45, '#ffffff00'); shade.addColorStop(1, '#3e4d26c9');
  ctx.fillStyle = shade; ctx.fillRect(-0.5, -0.5, 1, 1);
  const shine = ctx.createRadialGradient(-0.17, -0.23, 0, -0.17, -0.23, 0.2);
  shine.addColorStop(0, '#fffef4ff'); shine.addColorStop(0.45, '#fffef4d9'); shine.addColorStop(1, '#fffef400');
  ctx.fillStyle = shine; ctx.fillRect(-0.5, -0.5, 1, 1);
  ctx.restore();
  ctx.restore();
}
