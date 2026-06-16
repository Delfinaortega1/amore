/* ===================== */
/*   AMORE — script.js   */
/* ===================== */

// ——— MODO PROYECTOR ———
const MODO_PROYECTOR = window.location.search.includes('proyector');

if (MODO_PROYECTOR) {
  // Ocultar todo excepto el overlay de video
  document.body.style.background = '#000';
  document.querySelector('h1').style.display = 'none';
  document.getElementById('huellaA').style.display = 'none';
  document.getElementById('huellaB').style.display = 'none';
  document.getElementById('flor-wrapper').style.display = 'none';
  document.getElementById('sensor-tacto').style.display = 'none';
  document.getElementById('estado').style.display = 'none';
}

// ——— FIREBASE ———
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://amore-cff78-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Si es proyector, escucha cambios
if (MODO_PROYECTOR) {
  onValue(ref(db, 'estado/conexion'), (snapshot) => {
    const val = snapshot.val();
    if (val === true) {
      abrirProyeccion();
    } else {
      cerrarProyeccion();
    }
  });
}

// ——— ESTADO GLOBAL ———
let personaA = false;
let personaB = false;
let conexionHecha = false;
let temporizadorFinal = null;

// ——— REFERENCIAS DOM ———
const p1 = document.getElementById('p1');
const p2 = document.getElementById('p2');
const p3 = document.getElementById('p3');
const p4 = document.getElementById('p4');
const p5 = document.getElementById('p5');
const huellaA    = document.getElementById('huellaA');
const huellaB    = document.getElementById('huellaB');
const sensor     = document.getElementById('sensor-tacto');
const estadoEl   = document.getElementById('estado');
const estadoTxt  = document.getElementById('estado-texto');
const centroGlow = document.getElementById('centro-glow');

const fondoExplosion = document.createElement('div');
fondoExplosion.id = 'fondo-explosion';
document.body.appendChild(fondoExplosion);
if (MODO_PROYECTOR) {
  // Botón invisible para fullscreen
  const btnFS = document.createElement('div');
  btnFS.style.cssText = 'position:fixed;top:0;left:0;width:60px;height:60px;z-index:99999;cursor:pointer;';
  btnFS.addEventListener('click', () => {
    document.documentElement.requestFullscreen().catch(() => {});
    btnFS.remove();
  });
  document.body.appendChild(btnFS);
}
if (!MODO_PROYECTOR) {
  const btnSerial = document.createElement('button');
  btnSerial.textContent = '⚡ Conectar Arduino';
  btnSerial.style.cssText = `
    position:fixed; top:16px; right:16px; z-index:9999;
    background:rgba(155,93,229,0.2); color:rgba(220,180,255,0.9);
    border:1px solid rgba(155,93,229,0.4); border-radius:20px;
    padding:8px 16px; font-size:11px; letter-spacing:0.2em;
    text-transform:uppercase; cursor:pointer; font-family:inherit;
    transition:background 0.3s;
  `;
  document.body.appendChild(btnSerial);

  let puerto = null;
  let bufferSerial = '';

  btnSerial.addEventListener('click', async () => {
    try {
      puerto = await navigator.serial.requestPort();
      await puerto.open({ baudRate: 9600 });
      btnSerial.textContent = '✓ Arduino conectado';
      leerSerial();
    } catch(e) {
      btnSerial.textContent = '✗ Error al conectar';
    }
  });

  async function leerSerial() {
    const decoder = new TextDecoderStream();
    puerto.readable.pipeTo(decoder.writable);
    const lector = decoder.readable.getReader();
    try {
      while (true) {
        const { value, done } = await lector.read();
        if (done) break;
        if (value) {
          bufferSerial += value;
          const lineas = bufferSerial.split('\n');
          bufferSerial = lineas.pop();
          lineas.forEach(linea => procesarMensaje(linea.trim()));
        }
      }
    } catch(e) {}
  }

  function procesarMensaje(msg) {
    if (!msg) return;
    switch(msg) {
      case 'PERSONA_A_ON':  activarPersonaA();    break;
      case 'PERSONA_A_OFF': desactivarPersonaA(); break;
      case 'PERSONA_B_ON':  activarPersonaB();    break;
      case 'PERSONA_B_OFF': desactivarPersonaB(); break;
      case 'TOQUE':         activarConexion();    break;
    }
  }

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') activarPersonaA();
    if (k === 'b') activarPersonaB();
    if (k === 'q') desactivarPersonaA();
    if (k === 'w') desactivarPersonaB();
    if (k === ' ' || k === 'enter') { e.preventDefault(); activarConexion(); }
  });
}

const VIDEOS = ['aurora1.mp4'];
function abrirProyeccion() {
  const overlay = document.getElementById('proyeccion-overlay');
  const frame   = document.getElementById('proyeccion-frame');
  frame.src = VIDEOS[0];
  overlay.classList.add('visible');
  if (MODO_PROYECTOR) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function cerrarProyeccion() {
  const overlay = document.getElementById('proyeccion-overlay');
  const frame   = document.getElementById('proyeccion-frame');
  overlay.classList.remove('visible');
  setTimeout(() => { frame.src = ''; }, 1500);
}

// ——— UTILIDADES ———
function setEstado(txt, clases) {
  if (MODO_PROYECTOR) return;
  estadoTxt.textContent = txt;
  estadoEl.className = clases || '';
}

function limpiarClasesPetalo(petalo) {
  petalo.classList.remove('petalo-A','petalo-B','titilar','titilar-b','conexion','abierto');
}

// ——— REPOSO ———
function irAReposo() {
  if (temporizadorFinal) { clearTimeout(temporizadorFinal); temporizadorFinal = null; }
  cerrarProyeccion();
  set(ref(db, 'estado/conexion'), false);
  [p1,p2,p3,p4,p5].forEach(p => p.classList.remove('abierto'));
  setTimeout(() => {
    [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
    personaA = false; personaB = false; conexionHecha = false;
    huellaA.classList.remove('activa');
    huellaB.classList.remove('activa');
    sensor.classList.remove('visible');
    centroGlow.setAttribute('opacity', '0.3');
    centroGlow.setAttribute('r', '6');
    centroGlow.setAttribute('fill', '#7b3fc4');
    fondoExplosion.classList.remove('activo');
    setEstado('Sitúate sobre las huellas', '');
  }, 2000);
}

function irAEstado2(quienQueda) {
  if (temporizadorFinal) { clearTimeout(temporizadorFinal); temporizadorFinal = null; }
  cerrarProyeccion();
  set(ref(db, 'estado/conexion'), false);
  conexionHecha = false;
  sensor.classList.remove('visible');
  fondoExplosion.classList.remove('activo');
  [p1,p2,p3,p4,p5].forEach(p => p.classList.remove('abierto'));
  setTimeout(() => {
    [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
    centroGlow.setAttribute('opacity', '0.5');
    centroGlow.setAttribute('r', '8');
    centroGlow.setAttribute('fill', '#7b3fc4');
    if (quienQueda === 'A') {
      personaB = false; huellaB.classList.remove('activa');
      p1.classList.add('petalo-A'); p2.classList.add('petalo-A');
      p5.classList.add('titilar');
      setEstado('Falta una segunda persona', 'activo');
    } else {
      personaA = false; huellaA.classList.remove('activa');
      p4.classList.add('petalo-B'); p5.classList.add('petalo-B');
      p3.classList.add('titilar-b');
      setEstado('Falta una primera persona', 'activo');
    }
  }, 2000);
}

function activarPersonaA() {
  if (personaA || conexionHecha) return;
  personaA = true;
  huellaA.classList.add('activa');
  limpiarClasesPetalo(p1); limpiarClasesPetalo(p2);
  p1.classList.add('petalo-A'); p2.classList.add('petalo-A');
  limpiarClasesPetalo(p5); p5.classList.add('titilar');
  centroGlow.setAttribute('opacity', '0.5'); centroGlow.setAttribute('r', '8');
  if (personaB) pasarAEsperandoToque();
  else setEstado('Falta una segunda persona', 'activo');
}

function activarPersonaB() {
  if (personaB || conexionHecha) return;
  personaB = true;
  huellaB.classList.add('activa');
  limpiarClasesPetalo(p4); limpiarClasesPetalo(p5);
  p4.classList.add('petalo-B'); p5.classList.add('petalo-B');
  limpiarClasesPetalo(p3); p3.classList.add('titilar-b');
  centroGlow.setAttribute('opacity', '0.6'); centroGlow.setAttribute('r', '10');
  if (personaA) pasarAEsperandoToque();
  else setEstado('Falta una primera persona', 'activo');
}

function desactivarPersonaA() {
  if (!personaA) return;
  if (conexionHecha) { reproducirSonidoDesconexion(); irAEstado2('B'); }
  else {
    personaA = false; huellaA.classList.remove('activa');
    sensor.classList.remove('visible');
    if (!personaB) irAReposo();
    else {
      [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
      p4.classList.add('petalo-B'); p5.classList.add('petalo-B');
      p3.classList.add('titilar-b');
      centroGlow.setAttribute('opacity','0.5'); centroGlow.setAttribute('r','8');
      setEstado('Falta una primera persona', 'activo');
    }
  }
}

function desactivarPersonaB() {
  if (!personaB) return;
  if (conexionHecha) { reproducirSonidoDesconexion(); irAEstado2('A'); }
  else {
    personaB = false; huellaB.classList.remove('activa');
    sensor.classList.remove('visible');
    if (!personaA) irAReposo();
    else {
      [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
      p1.classList.add('petalo-A'); p2.classList.add('petalo-A');
      p5.classList.add('titilar');
      centroGlow.setAttribute('opacity','0.5'); centroGlow.setAttribute('r','8');
      setEstado('Falta una segunda persona', 'activo');
    }
  }
}

function pasarAEsperandoToque() {
  limpiarClasesPetalo(p3); p3.classList.add('titilar');
  sensor.classList.add('visible');
  setEstado('Toquen la planta', 'activo');
  centroGlow.setAttribute('opacity', '0.8'); centroGlow.setAttribute('r', '12');
}

function activarConexion() {
  if (conexionHecha || !personaA || !personaB) return;
  conexionHecha = true;
  sensor.classList.remove('visible');

  // Avisar al proyector via Firebase
  set(ref(db, 'estado/conexion'), true);

  [p1,p2,p3,p4,p5].forEach(p => { limpiarClasesPetalo(p); p.classList.add('conexion'); });
  centroGlow.setAttribute('r', '18'); centroGlow.setAttribute('opacity', '1');
  centroGlow.setAttribute('fill', '#e8b4ff');
  fondoExplosion.classList.add('activo');

  setTimeout(() => { p1.classList.add('abierto'); p5.classList.add('abierto'); }, 400);
  setTimeout(() => { p2.classList.add('abierto'); p4.classList.add('abierto'); }, 700);
  setTimeout(() => { p3.classList.add('abierto'); }, 1000);
  setTimeout(() => lanzarParticulas(), 600);
  setTimeout(() => lanzarParticulas(), 1200);
  setTimeout(() => lanzarParticulas(), 1900);
  setTimeout(() => reproducirSonidoConexion(), 500);
  setTimeout(() => setEstado('CONEXIÓN COMPLETA', 'conexion-total'), 800);
  setTimeout(() => abrirProyeccion(), 2000);

  temporizadorFinal = setTimeout(() => {
    reproducirSonidoDesconexion();
    set(ref(db, 'estado/conexion'), false);
    cerrarProyeccion();
    [p1,p2,p3,p4,p5].forEach(p => p.classList.remove('abierto'));
    setTimeout(() => {
      [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
      personaA = false; personaB = false; conexionHecha = false;
      temporizadorFinal = null;
      huellaA.classList.remove('activa'); huellaB.classList.remove('activa');
      centroGlow.setAttribute('opacity', '0.3'); centroGlow.setAttribute('r', '6');
      centroGlow.setAttribute('fill', '#7b3fc4');
      fondoExplosion.classList.remove('activo');
      setEstado('Sitúate sobre las huellas', '');
    }, 2000);
  }, 20000);
}

function lanzarParticulas() {
  const contenedor = document.getElementById('particulas');
  const colores = ['#e8b4ff','#9b5de5','#00f5d4','#ffffff','#c77dff','#48cae4'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particula';
    const size = Math.random() * 6 + 2;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 130 + 40;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 60;
    const dur = (Math.random() * 1.5 + 1.2).toFixed(2);
    const color = colores[Math.floor(Math.random() * colores.length)];
    const delay = (Math.random() * 0.4).toFixed(2);
    p.style.cssText = `width:${size}px;height:${size}px;background:${color};top:50%;left:50%;margin-top:-${size/2}px;margin-left:-${size/2}px;--tx:${tx}px;--ty:${ty}px;--dur:${dur}s;animation-delay:${delay}s;box-shadow:0 0 ${size*2}px ${color};`;
    contenedor.appendChild(p);
    setTimeout(() => p.remove(), (parseFloat(dur) + parseFloat(delay)) * 1000 + 100);
  }
}

function reproducirSonidoConexion() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notas = [220, 277.18, 329.63, 415.30, 523.25];
    notas.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.003, ctx.currentTime + 3);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 4.5);
      }, i * 180);
    });
  } catch(e) {}
}

function reproducirSonidoDesconexion() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass'; filtro.frequency.value = 1200; filtro.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    noise.connect(filtro); filtro.connect(gain); gain.connect(ctx.destination);
    noise.start(ctx.currentTime); noise.stop(ctx.currentTime + 2.1);
  } catch(e) {}
}

window.AMORE = {
  presionA: activarPersonaA,
  presionB: activarPersonaB,
  soltarA: desactivarPersonaA,
  soltarB: desactivarPersonaB,
  toque: activarConexion
};