/* app.js - lógica completa */
const LIST_KEY = 'prototipo_grupos_v1';

const btnCargar = document.getElementById('btnCargar');
const listaGrupos = document.getElementById('listaGrupos');
const nombreGrupoEl = document.getElementById('nombreGrupo');
const objetivosGrupoEl = document.getElementById('objetivosGrupo');
const metaGrupoEl = document.getElementById('metaGrupo');
const semillerosContainer = document.getElementById('semillerosContainer');
const listaDocentesEl = document.getElementById('listaDocentes');
const actividadesContainer = document.getElementById('actividadesContainer');

const selectGrupoDoc = document.getElementById('selectGrupoDoc');
const selectSemDoc = document.getElementById('selectSemDoc');

const selectSemEstudiante = document.getElementById('selectSemEstudiante');

const selectSemActividad = document.getElementById('selectSemActividad');

const formDocente = document.getElementById('formDocente');
const formEstudiante = document.getElementById('formEstudiante');
const formActividad = document.getElementById('formActividad');

const btnReset = document.getElementById('btnReset');
const btnExport = document.getElementById('btnExport');

let gruposData = [];      // datos actuales (cargados o desde localStorage)
let activoGrupoId = null; // id del grupo seleccionado

// ------- UTIL: Simula POST a un servidor externo (JSONPlaceholder) ------
async function simulatePost(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) {
    console.warn('Simulated POST falló (offline?)', e);
    return { ok: false };
  }
}

// ------- Cargar datos iniciales (desde localStorage o data/grupos.json) ------
async function loadInitialData() {
  const raw = localStorage.getItem(LIST_KEY);
  if (raw) {
    try {
      gruposData = JSON.parse(raw);
      console.log('Datos cargados desde localStorage');
      return;
    } catch(e) {
      console.warn('localStorage corrupto, recargando JSON');
    }
  }
  // fetch local JSON (requiere servir por http para evitar bloqueos file://)
  try {
    const res = await fetch('data/grupos.json');
    const obj = await res.json();
    gruposData = obj.grupos;
    saveToLocal();
    console.log('Datos cargados desde data/grupos.json');
  } catch (e) {
    console.error('No se pudo cargar data/grupos.json. Asegúrate de usar Live Server o servidor HTTP.', e);
    // fallback: grupos básicos en memoria
    gruposData = [
      { id: 'gieam', nombre: 'GIEAM', director:'Dra. Ana Torres', objetivos:'...', semilleros:[], docentes:[] },
      { id: 'comba', nombre:'COMBA I+D', director:'Dr. Carlos', objetivos:'...', semilleros:[], docentes:[] }
    ];
  }
}

function saveToLocal() {
  localStorage.setItem(LIST_KEY, JSON.stringify(gruposData));
}

// ------- Render listado de grupos (sidebar) ------
function renderGroupList() {
  listaGrupos.innerHTML = '';
  gruposData.forEach(g => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    if (g.id === activoGrupoId) li.classList.add('active');
    li.textContent = g.nombre;
    li.onclick = () => selectGroup(g.id);
    const badge = document.createElement('span');
    badge.className = 'badge bg-primary rounded-pill';
    badge.textContent = (g.semilleros ? g.semilleros.length : 0);
    li.appendChild(badge);
    listaGrupos.appendChild(li);
  });
}

// ------- Seleccionar grupo y mostrar detalle ------
function selectGroup(id) {
  activoGrupoId = id;
  const g = gruposData.find(x => x.id === id);
  if (!g) return;
  renderGroupList();

  nombreGrupoEl.textContent = g.nombre;
  metaGrupoEl.textContent = `Director: ${g.director}`;
  objetivosGrupoEl.textContent = g.objetivos;

  // Docentes del grupo
  listaDocentesEl.innerHTML = '';
  if (g.docentes && g.docentes.length) {
    g.docentes.forEach(d => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = `${d.nombre} — ${d.formacion} (${d.horario})`;
      listaDocentesEl.appendChild(li);
    });
  } else {
    listaDocentesEl.innerHTML = '<li class="list-group-item small text-muted">(No hay docentes registrados)</li>';
  }

  // Semilleros: mostrar nombre y docente asignado
  semillerosContainer.innerHTML = '';
  if (g.semilleros && g.semilleros.length) {
    g.semilleros.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card p-2 mb-2';
      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div><strong>${s.nombre}</strong><div class="small text-muted">Estudiantes: ${s.estudiantes.length} · Actividades: ${s.actividades.length}</div></div>
          <div class="small text-muted">Docente: <span class="fw-semibold">${s.docente || '(Sin asignar)'}</span></div>
        </div>
      `;
      semillerosContainer.appendChild(card);
    });
  } else {
    semillerosContainer.innerHTML = '<div class="small text-muted">(No hay semilleros)</div>';
  }

  // Actividades agrupadas por semillero
  actividadesContainer.innerHTML = '';
  if (g.semilleros && g.semilleros.length) {
    g.semilleros.forEach(s => {
      if (s.actividades && s.actividades.length) {
        const block = document.createElement('div');
        block.className = 'mb-2';
        const title = document.createElement('h6');
        title.textContent = s.nombre;
        block.appendChild(title);
        const ul = document.createElement('ul');
        ul.className = 'list-group';
        s.actividades.forEach(a => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.innerHTML = `<strong>${a.titulo}</strong> <small class="text-muted">(${a.tipo} • ${a.fecha} ${a.hora})</small><div>${a.resumen || ''}</div><div class="small text-muted">Límite: ${a.limite}</div>`;
          ul.appendChild(li);
        });
        block.appendChild(ul);
        actividadesContainer.appendChild(block);
      }
    });
    if (!actividadesContainer.innerHTML) actividadesContainer.innerHTML = '<div class="small text-muted">(No hay actividades registradas)</div>';
  } else {
    actividadesContainer.innerHTML = '<div class="small text-muted">(No hay actividades registradas)</div>';
  }

  // Poblar selects de formularios según el grupo seleccionado o global
  populateFormSelects();
}

// ------- Poblar selects (grupos y semilleros) ------
function populateFormSelects() {
  // selectGrupoDoc (todos los grupos)
  selectGrupoDoc.innerHTML = '<option value="">Seleccione grupo</option>';
  gruposData.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.nombre;
    selectGrupoDoc.appendChild(opt);
  });

  // selectSemDoc depende del grupo seleccionado en ese select
  selectSemDoc.innerHTML = '<option value="">(Opcional) seleccionar semillero</option>';

  // selectSemEstudiante -> solo semilleros COMBA
  selectSemEstudiante.innerHTML = '<option value="">Seleccione semillero (COMBA)</option>';
  const comba = gruposData.find(g => g.id === 'comba');
  if (comba) {
    comba.semilleros.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nombre;
      selectSemEstudiante.appendChild(opt);
    });
  }

  // selectSemActividad -> semilleros del grupo activo (si hay)
  selectSemActividad.innerHTML = '<option value="">Seleccione semillero</option>';
  const ag = gruposData.find(g => g.id === activoGrupoId) || gruposData[0];
  if (ag && ag.semilleros) {
    ag.semilleros.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${ag.nombre} • ${s.nombre}`;
      selectSemActividad.appendChild(opt);
    });
  }
}

// Cuando se cambia el grupo en el formulario de docente -> actualizar semilleros del select
selectGrupoDoc.addEventListener('change', () => {
  selectSemDoc.innerHTML = '<option value="">(Opcional) seleccionar semillero</option>';
  const gid = selectGrupoDoc.value;
  const g = gruposData.find(x => x.id === gid);
  if (g && g.semilleros) {
    g.semilleros.forEach(s => {
      const opt = document.createElement('option');
      opt.value = `${gid}__${s.id}`; // combo para identificar grupo y semillero
      opt.textContent = s.nombre;
      selectSemDoc.appendChild(opt);
    });
  }
});

// ------- Formulario: registrar docente (POST simulado + guardado local) ------
formDocente.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formDocente);
  const nombre = fd.get('nombre').trim();
  const formacion = fd.get('formacion').trim();
  const horario = fd.get('horario').trim();
  const grupoId = fd.get('grupo');
  const semCombo = fd.get('semillero'); // formato: grupoId__semId o empty

  if (!nombre || !formacion) return alert('Completa nombre y formación.');

  const nuevo = { id: 't_' + Date.now(), nombre, formacion, horario, grupoId };

  // Guardar en data local: agregar a lista de docentes del grupo
  const g = gruposData.find(x => x.id === grupoId);
  if (g) {
    g.docentes = g.docentes || [];
    g.docentes.push(nuevo);

    // Si seleccionó semillero, asignar como docente del semillero
    if (semCombo && semCombo.includes('__')) {
      const [gid, sid] = semCombo.split('__');
      const grupo = gruposData.find(x => x.id === gid);
      if (grupo) {
        const sem = grupo.semilleros.find(s => s.id === sid);
        if (sem) sem.docente = nombre;
      }
    }

    saveToLocal();
    renderGroupList();
    if (activoGrupoId === grupoId) selectGroup(grupoId);
  }

  // Simular POST
  const postRes = await simulatePost('https://jsonplaceholder.typicode.com/posts', nuevo);
  console.log('POST docente ->', postRes);

  alert(`Docente ${nombre} registrado en ${g ? g.nombre : grupoId}`);
  formDocente.reset();
});

// ------- Formulario: vincular estudiante a semillero ------
formEstudiante.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formEstudiante);
    const nombre = fd.get('nombre').trim();
    const codigo = fd.get('codigo').trim();
    const carrera = fd.get('carrera').trim();
    const semId = fd.get('semillero');

    if (!nombre || !codigo || !carrera || !semId) {
        return alert('Completa todos los datos y selecciona un semillero.');
    }

    // Busca el semillero en todos los grupos, no solo en COMBA
    let semilleroEncontrado = null;
    for (const grupo of gruposData) {
        semilleroEncontrado = grupo.semilleros.find(s => s.id === semId);
        if (semilleroEncontrado) {
            break; // Detiene la búsqueda si encuentra el semillero
        }
    }

    if (!semilleroEncontrado) {
        return alert('Semillero no encontrado.');
    }

    const estudiante = { id: 'e_' + Date.now(), nombre, codigo, carrera };
    semilleroEncontrado.estudiantes.push(estudiante);
    saveToLocal(); // Guarda los datos en el almacenamiento local

    // Simular POST
    const postRes = await simulatePost('https://jsonplaceholder.typicode.com/posts', { estudiante, semillero: semilleroEncontrado.nombre });
    console.log('POST estudiante ->', postRes);

    alert(`Estudiante ${nombre} vinculado a ${semilleroEncontrado.nombre}.`);
    formEstudiante.reset();

    // Actualizar vista si el grupo activo es el del semillero
    if (activoGrupoId === semilleroEncontrado.grupoId) {
        selectGroup(activoGrupoId);
    }
});

// ------- Formulario: agregar actividad a semillero ------
formActividad.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formActividad);
  const tipo = fd.get('tipo');
  const fecha = fd.get('fecha');
  const hora = fd.get('hora');
  const limite = fd.get('limite');
  const semId = fd.get('semillero'); // este es s.id (seleccionado en selectSemActividad)
  const titulo = fd.get('titulo').trim();
  const resumen = fd.get('resumen').trim();

  if (!tipo || !fecha || !hora || !limite || !semId || !titulo) return alert('Completa los campos obligatorios.');

  // semId en este select viene con valor s.id si se eligió (populado por populateFormSelects)
  // pero earlier we populated selectSemActividad with opt.value = s.id (or gid__sid?) -> we used s.id
  const target = gruposData.flatMap(g => g.semilleros.map(s => ({ grupoId: g.id, sem: s }))).find(x => x.sem.id === semId);
  if (!target) return alert('Semillero no encontrado.');

  const actividad = {
    id: 'a_' + Date.now(),
    tipo, fecha, hora, limite, titulo, resumen
  };

  target.sem.actividades.push(actividad);
  saveToLocal();

  // Simular POST
  const postRes = await simulatePost('https://jsonplaceholder.typicode.com/posts', { actividad, semillero: target.sem.nombre });
  console.log('POST actividad ->', postRes);

  alert(`Actividad "${titulo}" agregada a ${target.sem.nombre}`);
  formActividad.reset();

  // actualizar vista del grupo que contiene el semillero
  selectGroup(target.grupoId);
});

// ------- Buttons utilitarios ------
btnReset.addEventListener('click', () => {
  if (!confirm('Resetear datos locales y recargar estado inicial?')) return;
  localStorage.removeItem(LIST_KEY);
  loadInitialData().then(() => {
    activoGrupoId = null;
    renderGroupList();
    selectGroup(gruposData[0].id);
    alert('Datos reseteados al estado inicial.');
  });
});

btnExport.addEventListener('click', () => {
  console.log('Exportando datos actuales:', JSON.parse(JSON.stringify(gruposData)));
  alert('Datos exportados a consola (abre DevTools).');
});

// ------- Inicialización ------
(async function init() {
  await loadInitialData();
  renderGroupList();
  // seleccionar el primero por defecto
  if (gruposData && gruposData.length) {
    selectGroup(gruposData[0].id);
  }
  populateFormSelects();
})();
