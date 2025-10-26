/* ButtonFX — preserves original behaviors (sheen, magnet tilt, click burst, particles)
   - Keeps keyboard activation (Enter/Space)
   - Each button has a small variant: default, ripple, pulse
   - Organized for readability and easy tweaks
*/

class ButtonFX {
  static initAll() {
    document.querySelectorAll('.glass-btn').forEach(btn => {
      if (!btn.__fx) btn.__fx = new ButtonFX(btn);
    });
  }

  constructor(btn) {
    this.btn = btn;
    this.canvas = btn.querySelector('.sheen-canvas');
    this.glow = btn.querySelector('.glow-layer');
    this.ctx = this.canvas.getContext?.('2d') ?? null;
    this.particles = [];
    this.sheen = null;
    this.mouse = { x: 0, y: 0 };
    this.last = performance.now();
    this.color = this._voiceColor();
    this.variant = btn.dataset.variant || 'default';

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._bind();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  _voiceColor() {
    if (this.btn.classList.contains('voice-plum')) return [142,88,214];
    if (this.btn.classList.contains('voice-amber')) return [233,178,102];
    if (this.btn.classList.contains('voice-gold')) return [235,200,114];
    return [200,200,200];
  }

  _resize(){
    if (!this.canvas || !this.ctx) return;
    const rect = this.btn.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  _bind(){
    // pointer enter/move/leave
    this.btn.addEventListener('pointerenter', e => {
      this.btn.classList.add('is-active');
      this._spawnHoverBurst(e);
    });
    this.btn.addEventListener('pointermove', e => {
      const r = this.btn.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this._applyMagnet(e.clientX, e.clientY);
    });
    this.btn.addEventListener('pointerleave', () => {
      this.btn.classList.remove('is-active');
      this._releaseMagnet();
    });

    // click
    this.btn.addEventListener('click', e => this._triggerClick(e));

    // keyboard
    this.btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const r = this.btn.getBoundingClientRect();
        this._triggerClick({ clientX: r.left + r.width/2, clientY: r.top + r.height/2 });
      }
    });
  }

  _applyMagnet(clientX, clientY){
    const rect = this.btn.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = clientX - cx, dy = clientY - cy;
    const tx = dx * 0.06, ty = dy * 0.04;
    const rx = (-dy / rect.height) * 6, ry = (dx / rect.width) * 6;
    this.btn.style.transform = `translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`;
    this.glow.style.transform = `translate(${tx*0.2}px, ${ty*0.2}px) scale(1.02)`;
    this.glow.style.opacity = '1';
  }

  _releaseMagnet(){
    try {
      const anim = this.btn.animate([{transform:this.btn.style.transform},{transform:'translate(0,0) rotateX(0) rotateY(0) scale(1)'}],{duration:360,easing:'cubic-bezier(.2,.9,.3,1)'});
      anim.onfinish = ()=> this.btn.style.transform = 'none';
      const ganim = this.glow.animate([{transform:this.glow.style.transform||'none',opacity:1},{transform:'translate(0,0) scale(1)',opacity:0}],{duration:360,easing:'cubic-bezier(.2,.9,.3,1)'});
      ganim.onfinish = ()=>{ this.glow.style.transform='none'; this.glow.style.opacity='0'; };
    } catch(e){ this.btn.style.transform='none'; this.glow.style.transform='none'; this.glow.style.opacity='0'; }
  }

  _spawnHoverBurst(e){
    // subtle hover particles
    const r = this.btn.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for(let i=0;i<6;i++) this.particles.push(this._particle(x + (Math.random()-0.5)*8, y + (Math.random()-0.5)*8, 0.6 + Math.random()*1.4));
  }

  _triggerClick(e){
    const rect = this.btn.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    // sheen
    this._sweepSheen(x,y);
    // variant intensity
    const burstCount = this.variant === 'ripple' ? 36 : (this.variant === 'pulse' ? 30 : 24);
    for(let i=0;i<burstCount;i++) this.particles.push(this._particle(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20, 1 + Math.random()*2, true));
    // click pop animation
    try {
      const anim = this.btn.animate([{transform:this.btn.style.transform||'none'},{transform:'translate(0px,-10px) scale(1.06)'},{transform:this.btn.style.transform||'none'}],{duration:420,easing:'cubic-bezier(.2,.9,.3,1)'});
      anim.onfinish = ()=> this.btn.style.transform = 'none';
    } catch(e){ this.btn.style.transform = 'none'; }
  }

  _particle(x,y,size,burst=false){
    const a = Math.random()*Math.PI*2;
    const speed = burst ? (Math.random()*180+120) : (Math.random()*60+30);
    return {
      x,y,
      vx: Math.cos(a)*(speed*0.01),
      vy: Math.sin(a)*(speed*0.01)-(burst?0.5:0.1),
      life: 0.85 + Math.random()*0.6,
      maxLife: 0.85 + Math.random()*0.6,
      size: size*(burst?(1.6+Math.random()*2.2):(0.6+Math.random()*1.4)),
      color: this.color
    };
  }

  _sweepSheen(cx,cy){
    this.sheen = { t:0, cx, cy, dur: 520 + Math.random()*120 };
  }

  _update(dt){
    // update particles & sheen
    for(const p of this.particles){
      p.vx *= (1 - (0.05 * dt));
      p.vy += (9.8 * 0.02 * dt);
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.life -= dt * 0.9;
    }
    if(this.sheen){
      this.sheen.t += dt * (1000 / this.sheen.dur);
      if(this.sheen.t > 1) this.sheen = null;
    }
  }

  _clean(){
    if(this.particles.length > 300) this.particles.splice(0, this.particles.length - 300);
    this.particles = this.particles.filter(p => p.life > 0.02);
  }

  _render(){
    if(!this.ctx) return;
    const ctx = this.ctx;
    const W = this.canvas.width / (window.devicePixelRatio||1);
    const H = this.canvas.height / (window.devicePixelRatio||1);
    ctx.clearRect(0,0,W,H);

    // sheen base (follows mouse x)
    const baseX = (this.mouse.x || W*0.5);
    const g = ctx.createLinearGradient(baseX-120,0,baseX+120,0);
    g.addColorStop(0,'rgba(255,255,255,0.00)');
    g.addColorStop(0.35,'rgba(255,255,255,0.04)');
    g.addColorStop(0.5,`rgba(${this.color[0]},${this.color[1]},${this.color[2]},0.18)`);
    g.addColorStop(0.65,'rgba(255,255,255,0.03)');
    g.addColorStop(1,'rgba(255,255,255,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // sheen sweep stronger
    if(this.sheen){
      const s = this.sheen;
      const pos = Math.pow(Math.min(1,s.t),0.8);
      const sweepX = s.cx + (pos-0.5)*(W*1.6)*(Math.random()*0.2 + 0.9);
      const sweepW = Math.max(60,(1-pos)*360);
      const sg = ctx.createLinearGradient(sweepX - sweepW/2,0,sweepX + sweepW/2,0);
      sg.addColorStop(0,'rgba(255,255,255,0.00)');
      sg.addColorStop(0.45,'rgba(255,255,255,0.45)');
      sg.addColorStop(0.5,'rgba(255,255,255,0.85)');
      sg.addColorStop(0.55,'rgba(255,255,255,0.45)');
      sg.addColorStop(1,'rgba(255,255,255,0.00)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sg;
      ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // draw particles
    for(const p of this.particles){
      const lifeRatio = Math.max(0,Math.min(1,p.life / p.maxLife));
      ctx.globalAlpha = Math.pow(lifeRatio,1.6);
      const r = p.size * (1.0 + (1 - lifeRatio) * 0.6);
      const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2);
      grad.addColorStop(0, `rgba(${p.color[0]},${p.color[1]},${p.color[2]},0.98)`);
      grad.addColorStop(0.3, `rgba(${p.color[0]},${p.color[1]},${p.color[2]},0.6)`);
      grad.addColorStop(1, `rgba(255,255,255,0.02)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,r,r,0,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  _loop(now){
    const dt = Math.min(0.032,(now - this.last)/1000);
    this.last = now;
    this._update(dt);
    this._render();
    this._clean();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }
}

// initialize all buttons
document.addEventListener('DOMContentLoaded', () => {
  ButtonFX.initAll();
  // expose for debug if you want: window.ButtonFX = ButtonFX;
});
