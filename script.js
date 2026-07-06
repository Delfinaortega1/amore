/* ===================== */
/*   AMORE — script.js   */
/* ===================== */

// ——— MODO PROYECTOR ———
const MODO_PROYECTOR = window.location.search.includes('proyector');

if (MODO_PROYECTOR) {
  document.body.style.background = '#000';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('h1').style.display            = 'none';
    document.getElementById('huellaA').style.display      = 'none';
    document.getElementById('huellaB').style.display      = 'none';
    document.getElementById('flor-wrapper').style.display = 'none';
    document.getElementById('sensor-tacto').style.display = 'none';
    document.getElementById('estado').style.display       = 'none';

    const btnFS = document.createElement('div');
    btnFS.style.cssText = `
      position:fixed; inset:0; z-index:99999;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background:#000; cursor:pointer;
    `;
    btnFS.innerHTML = `
      <div style="
        border:1px solid rgba(155,93,229,0.5);
        border-radius:50%; width:80px; height:80px;
        display:flex; align-items:center; justify-content:center;
        margin-bottom:16px; box-shadow:0 0 30px rgba(155,93,229,0.3);
      ">
        <span style="font-size:28px;color:rgba(155,93,229,0.8);">✦</span>
      </div>
      <span style="
        font-family:'Cormorant Garamond',serif;
        font-size:11px; letter-spacing:0.5em;
        text-transform:uppercase; color:rgba(200,160,255,0.4);
        font-style:italic;
      ">iniciar proyección</span>
    `;
    btnFS.addEventListener('click', () => {
      document.documentElement.requestFullscreen().catch(() => {});
      desbloquearAudio();
      btnFS.remove();
    });
    document.body.appendChild(btnFS);
  });
}

// ——— FIREBASE ———
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://amore-cff78-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ——— RESET AL INICIAR ———
if (!MODO_PROYECTOR) {
  set(ref(db, 'sensores/mano_A'), false);
  set(ref(db, 'sensores/pie_A'),  false);
  set(ref(db, 'sensores/mano_B'), false);
  set(ref(db, 'sensores/pie_B'),  false);
  set(ref(db, 'estado/conexion'), false);
}

// ——— ESCUCHA FIREBASE (modo flor) ———
if (!MODO_PROYECTOR) {
  onValue(ref(db, 'sensores/mano_A'), (s) => {
    if (s.val() === true) activarPersonaA();
  });
  onValue(ref(db, 'sensores/pie_A'), (s) => {
    if (s.val() === true) activarPersonaA();
  });
  onValue(ref(db, 'sensores/mano_B'), (s) => {
    if (s.val() === true) activarPersonaB();
  });
  onValue(ref(db, 'sensores/pie_B'), (s) => {
    if (s.val() === true) activarPersonaB();
  });
  onValue(ref(db, 'estado/conexion'), (s) => {
    if (s.val() === true) activarConexion();
  });
}

// ——— ESCUCHA FIREBASE (modo proyector) ———
if (MODO_PROYECTOR) {
  onValue(ref(db, 'estado/conexion'), (snapshot) => {
    if (snapshot.val() === true) abrirProyeccion();
    else cerrarProyeccion();
  });
}

// ============================================
//   SONIDOS (archivos .mp3 reales)
// ============================================
// OJO: estos nombres tienen que coincidir letra por
// letra (incluidos espacios) con los archivos en tu carpeta.
const SONIDOS = {
  personaA:        new Audio('sonido-1 Persona A .mp3'),
  faltaOtra:       new Audio('sonido-2 Falta otra persona.mp3'),
  personaB:        new Audio('sonido-3 Persona B.mp3'),
  dosPersonas:     new Audio('sonido-4 Dos personas presentes.mp3'),
  toquePlanta:     new Audio('sonido-5 Toque de la planta.mp3'),
  conexionCompleta:new Audio('sonido-6 Conexión completa.mp3'),
  desconexion:     new Audio('sonido-7 Desconexión .mp3')
};

// Precargar todos
Object.values(SONIDOS).forEach(a => { a.preload = 'auto'; a.load(); });

let audioDesbloqueado = false;

// Los navegadores bloquean audio hasta que hay una interacción
// real del usuario en la página. Esto lo "desbloquea" una sola vez.
function desbloquearAudio() {
  if (audioDesbloqueado) return;
  audioDesbloqueado = true;
  Object.values(SONIDOS).forEach(a => {
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });
}
window.addEventListener('click', desbloquearAudio, { once: true });
window.addEventListener('keydown', desbloquearAudio, { once: true });
window.addEventListener('touchstart', desbloquearAudio, { once: true });

function reproducirSonido(nombre) {
  const audio = SONIDOS[nombre];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(e => console.warn('No se pudo reproducir', nombre, e));
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

// ——— BOTÓN ARDUINO (solo en modo flor) ———
if (!MODO_PROYECTOR) {
  const btnSerial = document.createElement('button');
  btnSerial.textContent = '⚡ Conectar Arduino';
  btnSerial.style.cssText = `
    position:fixed;top:16px;right:16px;z-index:9999;
    background:rgba(155,93,229,0.2);color:rgba(220,180,255,0.9);
    border:1px solid rgba(155,93,229,0.4);border-radius:20px;
    padding:8px 16px;font-size:11px;letter-spacing:0.2em;
    text-transform:uppercase;cursor:pointer;font-family:inherit;
  `;
  document.body.appendChild(btnSerial);

  let puerto = null;
  let bufferSerial = '';

  btnSerial.addEventListener('click', async () => {
    desbloquearAudio();
    try {
      puerto = await navigator.serial.requestPort();
      await puerto.open({ baudRate: 9600 });
      btnSerial.textContent = '✓ Arduino conectado';
      btnSerial.style.color = 'rgba(0,245,212,0.9)';
      btnSerial.style.pointerEvents = 'none';
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
          lineas.forEach(l => procesarMensaje(l.trim()));
        }
      }
    } catch(e) {}
  }

  function procesarMensaje(msg) {
    console.log("Arduino:", msg);
    if (!msg) return;
    switch(msg) {
      case 'PERSONA_A_ON':  activarPersonaA();    break;
      case 'PERSONA_A_OFF': desactivarPersonaA(); break;
      case 'PERSONA_B_ON':  activarPersonaB();    break;
      case 'PERSONA_B_OFF': desactivarPersonaB(); break;
      case 'TOQUE':         activarConexion();    break;
    }
  }

  // ——— TECLADO INALÁMBRICO ———
  // A = llega persona A | B = llega persona B
  // Q = se va persona A | W = se va persona B
  // Espacio / Enter = conexión completa
  // R = reset total
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    if (k === 'a') {
      set(ref(db, 'sensores/mano_A'), true);
      set(ref(db, 'sensores/pie_A'),  true);
      activarPersonaA();
    }

    if (k === 'b') {
      set(ref(db, 'sensores/mano_B'), true);
      set(ref(db, 'sensores/pie_B'),  true);
      activarPersonaB();
    }

    if (k === ' ' || k === 'enter') {
      e.preventDefault();
      set(ref(db, 'sensores/mano_A'), true);
      set(ref(db, 'sensores/pie_A'),  true);
      set(ref(db, 'sensores/mano_B'), true);
      set(ref(db, 'sensores/pie_B'),  true);
      set(ref(db, 'estado/conexion'), true);
      activarConexion();
    }

    if (k === 'q') {
      set(ref(db, 'sensores/mano_A'), false);
      set(ref(db, 'sensores/pie_A'),  false);
      desactivarPersonaA();
    }

    if (k === 'w') {
      set(ref(db, 'sensores/mano_B'), false);
      set(ref(db, 'sensores/pie_B'),  false);
      desactivarPersonaB();
    }

    if (k === 'r') {
      set(ref(db, 'sensores/mano_A'), false);
      set(ref(db, 'sensores/pie_A'),  false);
      set(ref(db, 'sensores/mano_B'), false);
      set(ref(db, 'sensores/pie_B'),  false);
      set(ref(db, 'estado/conexion'), false);
      irAReposo();
    }
  });
}

// ——— VIDEOS PROYECCIÓN ———
const VIDEOS = [
  'Aurora1.mp4','Aurora2.mp4','Aurora3.mp4','Aurora4.mp4',
  'Aurora5.mp4','Aurora6.mp4','Aurora7.mp4','Aurora8.mp4'
];

function abrirProyeccion() {
  const overlay = document.getElementById('proyeccion-overlay');
  const video   = document.getElementById('proyeccion-frame');
  const idx     = Math.floor(Math.random() * VIDEOS.length);
  video.src     = VIDEOS[idx];
  video.load();
  video.play().catch(() => {});
  overlay.classList.add('visible');
}

function cerrarProyeccion() {
  const overlay = document.getElementById('proyeccion-overlay');
  const video   = document.getElementById('proyeccion-frame');
  overlay.classList.remove('visible');
  setTimeout(() => { video.pause(); video.src = ''; }, 1500);
}

// ——— UTILIDADES ———
function setEstado(txt, clases) {
  if (MODO_PROYECTOR) return;
  estadoTxt.textContent = txt;
  estadoEl.className = clases || '';
}

function limpiarClasesPetalo(p) {
  p.classList.remove('petalo-A','petalo-B','titilar','titilar-b','conexion','abierto');
}

// ——— ESTADO 1: REPOSO ———
function irAReposo() {
  if (temporizadorFinal) { clearTimeout(temporizadorFinal); temporizadorFinal = null; }
  cerrarProyeccion();
  set(ref(db, 'estado/conexion'), false);
  [p1,p2,p3,p4,p5].forEach(p => p.classList.remove('abierto'));
  setTimeout(() => {
    [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
    personaA = false; personaB = false; conexionHecha = false;
    huellaA.classList.remove('activa'); huellaB.classList.remove('activa');
    sensor.classList.remove('visible');
    centroGlow.setAttribute('opacity','0.3');
    centroGlow.setAttribute('r','6');
    centroGlow.setAttribute('fill','#7b3fc4');
    fondoExplosion.classList.remove('activo');
    setEstado('Sitúate sobre las huellas','');
  }, 2000);
}

// ——— ESTADO 2: UNA PERSONA ———
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
    centroGlow.setAttribute('opacity','0.5');
    centroGlow.setAttribute('r','8');
    centroGlow.setAttribute('fill','#7b3fc4');
    if (quienQueda === 'A') {
      personaB = false; huellaB.classList.remove('activa');
      p1.classList.add('petalo-A'); p2.classList.add('petalo-A');
      p5.classList.add('titilar');
      setEstado('Falta una segunda persona','activo');
    } else {
      personaA = false; huellaA.classList.remove('activa');
      p4.classList.add('petalo-B'); p5.classList.add('petalo-B');
      p3.classList.add('titilar-b');
      setEstado('Falta una primera persona','activo');
    }
  }, 2000);
}

// ——— PERSONA A ———
function activarPersonaA() {
  if (personaA || conexionHecha) return;
  personaA = true;
  huellaA.classList.add('activa');
  limpiarClasesPetalo(p1); limpiarClasesPetalo(p2);
  p1.classList.add('petalo-A'); p2.classList.add('petalo-A');
  limpiarClasesPetalo(p5); p5.classList.add('titilar');
  centroGlow.setAttribute('opacity','0.5'); centroGlow.setAttribute('r','8');
  if (personaB) {
    pasarAEsperandoToque();
  } else {
    reproducirSonido('personaA');
    setTimeout(() => reproducirSonido('faltaOtra'), 900);
    setEstado('Falta una segunda persona','activo');
  }
}

// ——— PERSONA B ———
function activarPersonaB() {
  if (personaB || conexionHecha) return;
  personaB = true;
  huellaB.classList.add('activa');
  limpiarClasesPetalo(p4); limpiarClasesPetalo(p5);
  p4.classList.add('petalo-B'); p5.classList.add('petalo-B');
  limpiarClasesPetalo(p3); p3.classList.add('titilar-b');
  centroGlow.setAttribute('opacity','0.6'); centroGlow.setAttribute('r','10');
  if (personaA) {
    pasarAEsperandoToque();
  } else {
    reproducirSonido('personaB');
    setTimeout(() => reproducirSonido('faltaOtra'), 900);
    setEstado('Falta una primera persona','activo');
  }
}

// ——— DESACTIVAR A ———
function desactivarPersonaA() {
  if (!personaA) return;
  if (conexionHecha) { reproducirSonidoDesconexion(); irAEstado2('B'); }
  else {
    personaA = false; huellaA.classList.remove('activa');
    sensor.classList.remove('visible');
    if (!personaB) irAReposo();
    else {
      [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
      p4.classList.add('petalo-B'); p5.classList.add('petalo-B'); p3.classList.add('titilar-b');
      centroGlow.setAttribute('opacity','0.5'); centroGlow.setAttribute('r','8');
      setEstado('Falta una primera persona','activo');
    }
  }
}

// ——— DESACTIVAR B ———
function desactivarPersonaB() {
  if (!personaB) return;
  if (conexionHecha) { reproducirSonidoDesconexion(); irAEstado2('A'); }
  else {
    personaB = false; huellaB.classList.remove('activa');
    sensor.classList.remove('visible');
    if (!personaA) irAReposo();
    else {
      [p1,p2,p3,p4,p5].forEach(p => limpiarClasesPetalo(p));
      p1.classList.add('petalo-A'); p2.classList.add('petalo-A'); p5.classList.add('titilar');
      centroGlow.setAttribute('opacity','0.5'); centroGlow.setAttribute('r','8');
      setEstado('Falta una segunda persona','activo');
    }
  }
}

// ——— ESTADO 3A: ESPERANDO TOQUE ———
function pasarAEsperandoToque() {
  limpiarClasesPetalo(p3); p3.classList.add('titilar');
  sensor.classList.add('visible');
  setEstado('Toquen la planta','activo');
  centroGlow.setAttribute('opacity','0.8'); centroGlow.setAttribute('r','12');
  reproducirSonido('dosPersonas');
  setTimeout(() => reproducirSonido('toquePlanta'), 1300);
}

// ——— ESTADO 3B: CONEXIÓN ———
function activarConexion() {
  if (conexionHecha || !personaA || !personaB) return;
  conexionHecha = true;
  sensor.classList.remove('visible');

  set(ref(db, 'estado/conexion'), true);

  [p1,p2,p3,p4,p5].forEach(p => { limpiarClasesPetalo(p); p.classList.add('conexion'); });
  centroGlow.setAttribute('r','18'); centroGlow.setAttribute('opacity','1');
  centroGlow.setAttribute('fill','#e8b4ff');
  fondoExplosion.classList.add('activo');

  setTimeout(() => { p1.classList.add('abierto'); p5.classList.add('abierto'); }, 400);
  setTimeout(() => { p2.classList.add('abierto'); p4.classList.add('abierto'); }, 700);
  setTimeout(() => { p3.classList.add('abierto'); }, 1000);
  setTimeout(() => lanzarParticulas(), 600);
  setTimeout(() => lanzarParticulas(), 1200);
  setTimeout(() => lanzarParticulas(), 1900);
  setTimeout(() => reproducirSonidoConexion(), 500);
  setTimeout(() => setEstado('CONEXIÓN COMPLETA','conexion-total'), 800);

  // ——— ESTADO 4: FINAL ———
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
      centroGlow.setAttribute('opacity','0.3'); centroGlow.setAttribute('r','6');
      centroGlow.setAttribute('fill','#7b3fc4');
      fondoExplosion.classList.remove('activo');
      setEstado('Sitúate sobre las huellas','');
    }, 17000);
  }, 15000);
}

// ——— PARTÍCULAS ———
function lanzarParticulas() {
  const contenedor = document.getElementById('particulas');
  const colores = ['#e8b4ff','#9b5de5','#00f5d4','#ffffff','#c77dff','#48cae4'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particula';
    const size = Math.random()*6+2, angle = Math.random()*Math.PI*2;
    const dist = Math.random()*130+40;
    const tx = Math.cos(angle)*dist, ty = Math.sin(angle)*dist-60;
    const dur = (Math.random()*1.5+1.2).toFixed(2);
    const color = colores[Math.floor(Math.random()*colores.length)];
    const delay = (Math.random()*0.4).toFixed(2);
    p.style.cssText = `width:${size}px;height:${size}px;background:${color};top:50%;left:50%;margin-top:-${size/2}px;margin-left:-${size/2}px;--tx:${tx}px;--ty:${ty}px;--dur:${dur}s;animation-delay:${delay}s;box-shadow:0 0 ${size*2}px ${color};`;
    contenedor.appendChild(p);
    setTimeout(() => p.remove(), (parseFloat(dur)+parseFloat(delay))*1000+100);
  }
}

// ——— SONIDO CONEXIÓN ———
function reproducirSonidoConexion() {
  reproducirSonido('conexionCompleta');
}

// ——— SONIDO DESCONEXIÓN ———
// (desactivado a pedido: ya no suena nada acá, se dejó la función
// vacía para no romper los lugares que la llaman)
function reproducirSonidoDesconexion() {
  // sin sonido
}

window.AMORE = {
  presionA: activarPersonaA, presionB: activarPersonaB,
  soltarA: desactivarPersonaA, soltarB: desactivarPersonaB,
  toque: activarConexion
};