/* =========================================================
   Costuras & Modas — Login / Registro.
   ========================================================= */

(function () {
  'use strict';

  const API_CANDIDATES = ['../backend/api/', 'backend/api/', 'api/', ''];

  const LS = {
    userSession: 'cym_user_session',
    adminSession: 'cym_admin_session',
  };

  const ADMIN_USER_DEFAULT = 'admin123';
  const ADMIN_PASSWORD_DEFAULT = 'Admin123';

  const PANEL_PAGE = 'panel.html';
  const TIENDA_PAGE = 'tienda.html';

  // ---------- Helpers con fallback api/ -> '' ----------
  async function fetchWithFallback(path, options) {
    let lastRes = null;
    for (const base of API_CANDIDATES) {
      try {
        const res = await fetch(base + path, options);
        if (res.status === 404 && base === 'api/') { lastRes = res; continue; }
        return res;
      } catch (e) { if (base === API_CANDIDATES[API_CANDIDATES.length - 1]) throw e; }
    }
    return lastRes;
  }
  async function apiGet(path) {
    const res = await fetchWithFallback(path);
    const txt = await res.text();
    try { return JSON.parse(txt); } catch (e) { return {}; }
  }
  async function apiSend(path, method, data) {
    const res = await fetchWithFallback(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const txt = await res.text();
    let j = {};
    try { j = txt ? JSON.parse(txt) : {}; } catch (e) { j = { error: txt.slice(0, 200) }; }
    return { ok: res.ok, data: j };
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // =========================================================
  // NAVEGACIÓN ENTRE PANTALLAS
  // =========================================================

  const selectorScreen = document.getElementById('selectorScreen');
  const slider = document.getElementById('slider');

  const POS = { LOGIN: 0, SIGNUP: 420, ADMIN: 840 };

  function showSelector() {
    if(selectorScreen) selectorScreen.style.display = 'flex';
    if(slider) slider.style.display = 'none';
  }

  function showSlider(position) {
    if(selectorScreen) selectorScreen.style.display = 'none';
    if(slider){ slider.style.display = 'flex'; }
    const loginForm = document.querySelector('.form.login');
    const signupForm = document.querySelector('.form.signup');
    const loginContainer = document.querySelector('.form-container.login-user');
    const adminContainer = document.querySelector('.form-container.login-admin');
    const adminForm = document.querySelector('.form.admin');
    // FIX: navegación robusta solo con display (no depende de ancho/slider scrollWidth)
    // Así funciona en desktop y móvil sin que el transform lo rompa
    if(position===POS.LOGIN){
      if(loginForm) loginForm.style.display='flex';
      if(signupForm) signupForm.style.display='none';
      if(adminContainer) adminContainer.style.display='none';
      if(loginContainer) loginContainer.style.display='flex';
      if(adminForm) adminForm.style.display='none';
    } else if(position===POS.SIGNUP){
      if(loginForm) loginForm.style.display='none';
      if(signupForm) signupForm.style.display='flex';
      if(adminContainer) adminContainer.style.display='none';
      if(loginContainer) loginContainer.style.display='flex';
      if(adminForm) adminForm.style.display='none';
    } else if(position===POS.ADMIN){
      if(loginContainer) loginContainer.style.display='none';
      if(signupForm) signupForm.style.display='none';
      if(loginForm) loginForm.style.display='none';
      if(adminContainer) adminContainer.style.display='flex';
      if(adminForm) adminForm.style.display='flex';
    }
    // Reset transform: usamos display, no desplazamiento, para que el botón oculto siempre muestre admin
    if(slider) slider.style.transform = 'none';
    // Guarda posición para debugging / hash
    try{ slider.setAttribute('data-pos', String(position)); }catch(e){}
  }
  // Exponer global para que el botón oculto siempre funcione (evita "no lleva a nada")
  window.showSlider = showSlider;
  window.mostrarAdmin = function(){ showSlider(POS.ADMIN); };
  window.mostrarLogin = function(){ showSlider(POS.LOGIN); };
  window.mostrarSignup = function(){ showSlider(POS.SIGNUP); };
  window.POS = POS;

  // Inicial: muestra login directo (corrige bug cuadro cortado) pero respeta #admin / #usuario / ?reset
  (function initPantalla(){
    const hash = window.location.hash || '';
    const params = new URLSearchParams(window.location.search);
    if(params.get('reset') || hash === '#admin'){
      showSlider(POS.ADMIN);
      // si es #admin, el admin debe verse aunque el selector esté oculto
      setTimeout(function(){ const el=document.querySelector('.admin-user'); if(el) el.focus(); }, 300);
    } else if(hash === '#usuario' || hash === '#login'){
      showSlider(POS.LOGIN);
    } else if(hash === '#registro' || hash === '#signup'){
      showSlider(POS.SIGNUP);
    } else {
      showSlider(POS.LOGIN);
    }
  })();

  const usuarioBtnEl = document.getElementById('usuarioBtn');
  if(usuarioBtnEl) usuarioBtnEl.addEventListener('click', function(e){ if(e) e.preventDefault(); showSlider(POS.LOGIN); });
  const adminBtnEl = document.getElementById('adminBtn');
  if(adminBtnEl) adminBtnEl.addEventListener('click', function(e){ if(e) e.preventDefault(); showSlider(POS.ADMIN); });

  const backLoginEl = document.getElementById('backFromUserLogin');
  if(backLoginEl) backLoginEl.addEventListener('click', function(e){ if(e) e.preventDefault(); showSelector(); });
  const backSignupEl = document.getElementById('backFromUserSignup');
  if(backSignupEl) backSignupEl.addEventListener('click', function(e){ if(e) e.preventDefault(); showSlider(POS.LOGIN); });
  const backAdminEl = document.getElementById('backFromAdmin');
  if(backAdminEl) backAdminEl.addEventListener('click', function(e){
    if(e) e.preventDefault();
    // FIX: "Atrás" en admin siempre vuelve al login, no al selector vacío
    showSlider(POS.LOGIN);
  });

  const goSignupEl = document.getElementById('goSignup');
  if(goSignupEl) goSignupEl.addEventListener('click', function(e){ if(e) e.preventDefault(); showSlider(POS.SIGNUP); });
  const goLoginEl = document.getElementById('goLogin');
  if(goLoginEl) goLoginEl.addEventListener('click', function(e){ if(e) e.preventDefault(); showSlider(POS.LOGIN); });
  // Delegación extra por si el DOM cambia (evita que "Regístrate" no haga nada)
  document.addEventListener('click', function(e){
    const t = e.target.closest && e.target.closest('#goSignup');
    if(t){ e.preventDefault(); showSlider(POS.SIGNUP); }
    const t2 = e.target.closest && e.target.closest('#goLogin');
    if(t2){ e.preventDefault(); showSlider(POS.LOGIN); }
    const t3 = e.target.closest && e.target.closest('#backFromAdmin');
    if(t3){ e.preventDefault(); showSlider(POS.LOGIN); }
  });

  // =========================================================
  // MOSTRAR / OCULTAR CONTRASEÑA - sirve en login, registro y recuperar
  // =========================================================
  // Delegación global: funciona aunque el modal esté hidden al cargar
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.toggle-password');
    if(!btn) return;
    const input = btn.parentElement ? btn.parentElement.querySelector('input') : null;
    if(!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁️';
    btn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  // =========================================================
  // LOGIN USUARIO NORMAL
  // =========================================================

  const loginForm = document.querySelector('.form.login');
  const loginEmail = loginForm.querySelector('.user-email');
  const loginPassword = loginForm.querySelector('.user-password');
  const loginSubmit = loginForm.querySelector('.btn-submit');

  loginSubmit.addEventListener('click', async function () {
    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    if (!email || !password) {
      showToast('Completa correo y contraseña');
      return;
    }

    loginSubmit.disabled = true;
    try {
      const { ok, data } = await apiSend('usuarios.php?accion=login', 'POST', { email, password });

      if (!ok) {
        showToast(data.error || 'Correo o contraseña incorrectos');
        return;
      }

      saveJSON(LS.userSession, { id: data.id, email: data.email, nombre: data.nombre, apellido: data.apellido || '', telefono: data.telefono || '', whatsapp: data.whatsapp || '', loginAt: new Date().toISOString() });
      showToast('¡Bienvenido, ' + data.nombre + '!');
      setTimeout(() => { window.location.href = TIENDA_PAGE; }, 800);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error de conexión: ' + (err.message || ''));
    } finally {
      loginSubmit.disabled = false;
    }
  });

  // =========================================================
  // REGISTRO USUARIO NORMAL
  // =========================================================

  const signupForm = document.querySelector('.form.signup');
  const signupSubmit = signupForm.querySelector('.btn-submit');

  signupSubmit.addEventListener('click', async function () {
    const nombre = signupForm.querySelector('.signup-nombre').value.trim();
    const apellido = signupForm.querySelector('.signup-apellido').value.trim();
    const email = signupForm.querySelector('.signup-email').value.trim().toLowerCase();
    const password = signupForm.querySelector('.signup-password').value;
    const telefono = signupForm.querySelector('.signup-telefono').value.trim();
    const whatsapp = signupForm.querySelector('.signup-whatsapp').value.trim();
    const departamento = signupForm.querySelector('.signup-departamento').value.trim();
    const ciudad = signupForm.querySelector('.signup-ciudad').value.trim();

    const terminosChk = signupForm.querySelector('.signup-terminos');
    if (!nombre || !apellido || !email || !password || !telefono || !whatsapp || !departamento || !ciudad) {
      showToast('Completa todos los campos');
      return;
    }
    if (terminosChk && !terminosChk.checked) {
      showToast('Debes aceptar Términos y Condiciones');
      return;
    }
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    signupSubmit.disabled = true;
    try {
      const { ok, data } = await apiSend('usuarios.php?accion=registro', 'POST', {
        nombre, apellido, email, password, telefono, whatsapp, departamento, ciudad,
      });

      if (!ok) {
        showToast(data.error || 'No se pudo crear la cuenta');
        return;
      }

      saveJSON(LS.userSession, { id: data.id, email, nombre, apellido, telefono, whatsapp, loginAt: new Date().toISOString() });
      showToast('¡Cuenta creada! Bienvenido, ' + nombre);
      setTimeout(() => { window.location.href = TIENDA_PAGE; }, 800);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error de conexión: ' + (err.message || ''));
    } finally {
      signupSubmit.disabled = false;
    }
  });

  // =========================================================
  // LOGIN ADMINISTRADOR
  // =========================================================

  const adminForm = document.querySelector('.form.admin');
  const adminUser = adminForm.querySelector('.admin-user');
  const adminPassword = adminForm.querySelector('.admin-password');
  const adminSubmit = adminForm.querySelector('.btn-submit');

  adminSubmit.addEventListener('click', async function () {
    const usuario = adminUser.value.trim();
    const password = adminPassword.value;

    if (!usuario || !password) {
      showToast('Ingresa usuario y contraseña de administrador');
      return;
    }

    adminSubmit.disabled = true;
    try {
      // El usuario y la contraseña del admin viven en la tabla "configuracion"
      const config = await apiGet('configuracion.php');
      const usuarioCorrecto = config.adminUsuario || ADMIN_USER_DEFAULT;
      const claveCorrecta = config.adminPassword || ADMIN_PASSWORD_DEFAULT;

      if (usuario !== usuarioCorrecto || password !== claveCorrecta) {
        showToast('Credenciales de administrador incorrectas');
        return;
      }

      saveJSON(LS.adminSession, { role: 'admin', username: usuarioCorrecto, loginAt: new Date().toISOString() });
      showToast('Acceso concedido. Cargando panel...');
      setTimeout(() => { window.location.href = PANEL_PAGE; }, 600);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error de conexion.');
    } finally {
      adminSubmit.disabled = false;
    }
  });

  // Permitir enviar formularios con Enter en cualquier campo
  [loginPassword, loginEmail].forEach(function(input){
    if(!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = input.closest('.form') && input.closest('.form').querySelector('.btn-submit');
        if(btn) btn.click();
      }
    });
  });
  if(adminPassword) adminPassword.addEventListener('keydown', function(e){
    if(e.key==='Enter'){ e.preventDefault(); const b=adminPassword.closest('.form').querySelector('.btn-submit'); if(b) b.click(); }
  });
  if(adminUser) adminUser.addEventListener('keydown', function(e){
    if(e.key==='Enter'){ e.preventDefault(); const b=adminUser.closest('.form').querySelector('.btn-submit'); if(b) b.click(); }
  });
  // Todos los inputs del signup con Enter -> Crear cuenta
  if(signupForm){
    signupForm.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('keydown', function(e){
        if(e.key==='Enter'){ e.preventDefault(); signupSubmit.click(); }
      });
    });
  }

  // =========================================================
  // RECUPERAR CONTRASENA - boton igual al de registrarse
  // Paso 1 verifica correo+nombre+telefono, Paso 2 restablece
  // =========================================================
  const recuperarOverlay = document.getElementById('recuperarOverlay');
  const recuperarPaso1 = document.getElementById('recuperarPaso1');
  const recuperarPaso2 = document.getElementById('recuperarPaso2');
  const recuperarLinkBox = document.getElementById('recuperarLinkBox');
  const recuperarLink = document.getElementById('recuperarLink');
  const recuperarTokenInput = document.getElementById('recuperarToken');

  function abrirRecuperar() {
    if (!recuperarOverlay) return;
    recuperarOverlay.hidden = false;
    if (recuperarPaso1) recuperarPaso1.hidden = false;
    if (recuperarPaso2) recuperarPaso2.hidden = true;
    if (recuperarLinkBox) recuperarLinkBox.hidden = true;
    if (recuperarTokenInput) recuperarTokenInput.value = '';
  }
  function cerrarRecuperar() {
    if (recuperarOverlay) recuperarOverlay.hidden = true;
  }
  const goRecuperar = document.getElementById('goRecuperar');
  if (goRecuperar) goRecuperar.addEventListener('click', abrirRecuperar);
  const volverLogin = document.getElementById('volverLogin');
  if (volverLogin) volverLogin.addEventListener('click', cerrarRecuperar);
  const recuperarClose = document.getElementById('recuperarClose');
  if (recuperarClose) recuperarClose.addEventListener('click', cerrarRecuperar);
  if (recuperarOverlay) recuperarOverlay.addEventListener('click', function(e){ if(e.target===recuperarOverlay) cerrarRecuperar(); });

  const btnVerificarDatos = document.getElementById('btnVerificarDatos');
  if (btnVerificarDatos) btnVerificarDatos.addEventListener('click', async function(){
    const emailEl = document.getElementById('recuperarEmail');
    const nombreEl = document.getElementById('recuperarNombre');
    const telEl = document.getElementById('recuperarTelefono');
    const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
    const nombre = nombreEl ? nombreEl.value.trim() : '';
    const telefono = telEl ? telEl.value.trim() : '';
    if(!email || !nombre || !telefono){ showToast('Completa correo, nombre y telefono'); return; }
    btnVerificarDatos.disabled = true;
    const txtOrig = btnVerificarDatos.textContent;
    btnVerificarDatos.textContent = 'Verificando...';
    try{
      const res = await apiSend('usuarios.php?accion=solicitar_recuperacion','POST',{email: email, nombre: nombre, telefono: telefono});
      if(!res.ok){ showToast(res.data.error||'No se pudo verificar'); return; }
      const data = res.data;
      showToast('Link enviado a tu correo (simulado)');
      if(recuperarLink){
        const url = data.resetUrl || ('costuras_y_modas.html?reset='+ (data.token||''));
        recuperarLink.href = url;
        recuperarLink.textContent = url;
      }
      if(recuperarLinkBox) recuperarLinkBox.hidden = false;
      if(recuperarTokenInput) recuperarTokenInput.value = data.token || '';
      if(recuperarPaso2) recuperarPaso2.hidden = false;
      const nuevaEl = document.getElementById('recuperarNueva');
      if(nuevaEl) nuevaEl.focus();
    }catch(err){
      console.error(err); showToast('Error: '+(err.message||'conexion'));
    }finally{
      btnVerificarDatos.disabled = false;
      btnVerificarDatos.textContent = txtOrig || 'Verificar datos';
    }
  });

  const btnRestablecer = document.getElementById('btnRestablecer');
  if (btnRestablecer) btnRestablecer.addEventListener('click', async function(){
    const tokenEl = document.getElementById('recuperarToken');
    const nuevaEl = document.getElementById('recuperarNueva');
    const confirmarEl = document.getElementById('recuperarConfirmar');
    const token = tokenEl ? tokenEl.value.trim() : '' || new URLSearchParams(window.location.search).get('reset') || '';
    const nueva = nuevaEl ? nuevaEl.value : '';
    const confirmar = confirmarEl ? confirmarEl.value : '';
    if(!token){ showToast('Falta el token, verifica tus datos primero'); return; }
    if(!nueva || nueva.length<6){ showToast('Minimo 6 caracteres'); return; }
    if(nueva!==confirmar){ showToast('Las contrasenas no coinciden'); return; }
    btnRestablecer.disabled = true;
    const txtOrig2 = btnRestablecer.textContent;
    btnRestablecer.textContent = 'Guardando...';
    try{
      const res = await apiSend('usuarios.php?accion=reset_password','POST',{token: token, nuevaPassword: nueva, confirmar: confirmar});
      if(!res.ok){ showToast(res.data.error||'No se pudo restablecer'); return; }
      showToast('Contrasena cambiada, ya puedes ingresar');
      cerrarRecuperar();
      if(window.history.replaceState) window.history.replaceState({},'', 'costuras_y_modas.html');
      showSlider(POS.LOGIN);
      const loginE = document.querySelector('.user-email');
      if(loginE && document.getElementById('recuperarEmail')) loginE.value = document.getElementById('recuperarEmail').value.trim();
    }catch(err){
      console.error(err); showToast('Error: '+(err.message||'conexion'));
    }finally{
      btnRestablecer.disabled = false;
      btnRestablecer.textContent = txtOrig2 || 'Restablecer contrasena';
    }
  });

  (function checkResetFromUrl(){ // Si viene ?reset=TOKEN abre directo paso 2
    const token = new URLSearchParams(window.location.search).get('reset');
    if(token){
      abrirRecuperar();
      if(recuperarPaso1) recuperarPaso1.hidden = true;
      if(recuperarLinkBox) recuperarLinkBox.hidden = true;
      if(recuperarPaso2) recuperarPaso2.hidden = false;
      if(recuperarTokenInput) recuperarTokenInput.value = token;
      showToast('Ingresa tu nueva contrasena');
    }
  })();

  // =========================================================
  // TERMINOS Y CONDICIONES - modal en registro
  // =========================================================
  const terminosOverlay = document.getElementById('terminosOverlay');
  const terminosTexto = document.getElementById('terminosTexto');
  const openTerminosSignup = document.getElementById('openTerminosSignup');
  const terminosClose = document.getElementById('terminosClose');
  const terminosAceptar = document.getElementById('terminosAceptar');
  async function cargarTerminos(){
    try{
      const cfg = await apiGet('configuracion.php');
      const txt = cfg.terminosCondiciones || cfg.terminos_condiciones || cfg.terminos || 'Al comprar aceptas pagar 40000 de anticipo via Nequi si eliges transferencia, o pagar en fisico en el taller. Tiempo espera 1-2 semanas.';
      if(terminosTexto) terminosTexto.textContent = txt;
    }catch(e){}
  }
  if(openTerminosSignup) openTerminosSignup.addEventListener('click', async function(e){ e.preventDefault(); await cargarTerminos(); if(terminosOverlay) terminosOverlay.hidden=false; });
  if(terminosClose) terminosClose.addEventListener('click', function(){ if(terminosOverlay) terminosOverlay.hidden=true; });
  if(terminosAceptar) terminosAceptar.addEventListener('click', function(){
    const chk = document.querySelector('.signup-terminos');
    if(chk) chk.checked = true;
    if(terminosOverlay) terminosOverlay.hidden=true;
    showToast('Terminos aceptados');
  });
  if(terminosOverlay) terminosOverlay.addEventListener('click', function(e){ if(e.target===terminosOverlay) terminosOverlay.hidden=true; });
  cargarTerminos();

})();
