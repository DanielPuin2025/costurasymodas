/* =========================================================
   Costuras y Modas — Panel de Administrador
   Nuevo flujo: solicitudes con código de verificación
   ========================================================= */

(function () {
  'use strict';

  const API_CANDIDATES = ['../backend/api/','backend/api/','api/',''];
  const LS_ADMIN_SESSION = 'cym_admin_session';
  const LOGIN_PAGE = 'costuras_y_modas.html';
  const TIENDA_PAGE = 'tienda.html';

  const DEFAULT_CONFIG = {
    logo: '',
    frase: 'Moda con identidad, hecha a tu medida.',
    nombreEmpresa: 'Costuras y Modas',
    whatsapp: '',
    tiendaDisponible: '1',
    horarioApertura: '08:00',
    horarioCierre: '18:00',
    horarioDias: 'Lunes a Sábado',
    direccionTaller: 'Taller Costuras y Modas - Dirección por definir',
    fotoTaller: '',
    telefonoTaller: '',
    nequi: '',
    anticipoValor: '40000',
    tiempoEsperaDias: '10',
    terminosCondiciones: 'Solo 2 métodos: 1) Cliente paga y va al local (retiro en taller), 2) Contraentrega por Nequi con anticipo 40.000 COP. Si no estás a la hora acordada sin avisar, se retiene el anticipo. Tiempo espera 1-2 semanas.',
    adminUsuario: 'admin123',
    adminPassword: 'Admin123',
    // Categorías de producto
    categoriasProductos: ['Camisas', 'Pantalones', 'Chaquetas', 'Uniformes', 'Overoles', 'Ofertas', 'General'],
  };

  function actualizarFaviconYTitle(){
    try{
      let link=document.getElementById('favicon');
      if(!link){ link=document.createElement('link'); link.id='favicon'; link.rel='icon'; link.type='image/png'; document.head.appendChild(link); }
      if(config && config.logo) link.href=config.logo;
      else link.href='logo.png';
      let link2=document.querySelector('link[rel="shortcut icon"]');
      if(link2) link2.href=link.href;
      if(config && config.nombreEmpresa) document.title=config.nombreEmpresa+' · Panel de Administrador';
    }catch(e){}
  }

  // ---------- Helpers con fallback api/ -> '' ----------
  async function fetchWithFallback(path, options){
    let lastRes=null, lastErr=null;
    for(const base of API_CANDIDATES){
      try{
        const res = await fetch(base + path, options);
        if(res.status===404 && base==='api/'){ lastRes=res; continue; }
        return res;
      }catch(e){ lastErr=e; }
    }
    if(lastRes) return lastRes;
    throw lastErr || new Error('Error de red');
  }
  async function apiGet(path) {
    const res = await fetchWithFallback(path);
    const txt = await res.text();
    let data;
    try{ data = JSON.parse(txt); }catch(e){ throw new Error('Respuesta no JSON: '+txt.slice(0,200)); }
    if(!res.ok) throw new Error(data.error || 'Error '+res.status);
    return data;
  }
  async function apiSend(path, method, data) {
    const res = await fetchWithFallback(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const txt = await res.text();
    let json={};
    try{ json = txt ? JSON.parse(txt) : {}; }catch(e){ throw new Error('Respuesta no JSON: '+txt.slice(0,200)); }
    if (!res.ok) throw new Error(json.error || txt.slice(0,200) || 'Error');
    return json;
  }

  function loadLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  const session = loadLocal(LS_ADMIN_SESSION, null);
  if (!session || session.role !== 'admin') {
    window.location.href = LOGIN_PAGE;
    return;
  }

  let productos = [];
  let pedidos = [];
  let config = Object.assign({}, DEFAULT_CONFIG);
  config.categoriasProductos = [...DEFAULT_CONFIG.categoriasProductos];

  function showToast(message) { // Muestra notificación flotante
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  function mostrarError(err) { // Loguea error y muestra toast de conexión
    console.error(err);
    showToast('⚠️ ' + (err.message || 'Error de conexión.'));
  }
  function formatPrecio(value) { // Formatea número a $ COP
    const number = Number(value) || 0;
    return '$' + number.toLocaleString('es-CO');
  }
  function formatFecha(iso) { // Formatea ISO a fecha legible es-CO
    try {
      const date = new Date(iso);
      return date.toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch (e) { return ''; }
  }
  function escapeHtml(str) { // Escapa HTML para evitar XSS
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function cerrarSesion() { // Borra sesión admin y vuelve al login
    localStorage.removeItem(LS_ADMIN_SESSION);
    renderMenu(); // Actualizar menú antes de redirigir
    window.location.href = LOGIN_PAGE;
  }
  document.getElementById('btn-salir').addEventListener('click', function () {
    if (!confirm('¿Seguro que deseas salir del panel?')) return;
    cerrarSesion();
  });
  document.getElementById('btn-ver-tienda').addEventListener('click', function () {
    window.open(TIENDA_PAGE, '_blank');
  });

  // ---------- Modal Perfil ----------
  const modalPerfil = document.getElementById('modal-perfil');
  function abrirPerfil() {
    document.getElementById('perfil-nombre').textContent = session.username || 'admin';
    document.getElementById('perfil-usuario').textContent = session.username || 'admin';
    document.getElementById('perfil-fecha').textContent = session.loginAt ? formatFecha(session.loginAt) : '—';
    modalPerfil.hidden = false;
  }
  function cerrarPerfil() { modalPerfil.hidden = true; }
  document.getElementById('btn-perfil').addEventListener('click', abrirPerfil);
  document.getElementById('btn-cerrar-perfil').addEventListener('click', cerrarPerfil);
  modalPerfil.addEventListener('click', function (e) { if (e.target === modalPerfil) cerrarPerfil(); });
  document.getElementById('btn-perfil-salir').addEventListener('click', function () {
    if (!confirm('¿Seguro que deseas salir del panel?')) return;
    cerrarSesion();
  });
  document.getElementById('btn-perfil-cambiar-clave').addEventListener('click', function () {
    cerrarPerfil();
    document.querySelector('.tab[data-tab="config"]').click();
    setTimeout(() => {
      document.getElementById('config-password').focus();
      document.getElementById('config-password').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });

  // ---------- Renderizar menú lateral según sesión ----------
  function renderMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const menuPanel = document.getElementById('menuPanel');
    const btnCerrarSesionMenu = document.getElementById('btnCerrarSesionMenu');
    const tallerInfo = document.getElementById('tallerInfoBox');
    const tallerTelefoMenu = document.getElementById('tallerTelefoMenu');
    const tallerHorarioMenu = document.getElementById('tallerHorarioMenu');
    const tallerEsperaMenu = document.getElementById('tallerEsperaMenu');
    const nequiMenu = document.getElementById('nequiMenu');
    const tallerWhatsAppMenu = document.getElementById('tallerWhatsAppMenu');
    
    if (!menuOverlay || !menuPanel || !btnCerrarSesionMenu) return;
    
    // Si hay sesión admin activa
    if (session && session.role === 'admin') {
      // Mostrar información del taller
      if (tallerTelefoMenu) tallerTelefoMenu.textContent = config.telefonoTaller || config.whatsapp || '—';
      if (tallerHorarioMenu) tallerHorarioMenu.textContent = config.horarioDias + ' ' + config.horarioApertura + '-' + config.horarioCierre;
      if (tallerEsperaMenu) tallerEsperaMenu.textContent = config.tiempoEsperaDias + ' días';
      if (nequiMenu) nequiMenu.textContent = config.nequi || 'No configurado';
      
      // Mostrar botón de cerrar sesión
      btnCerrarSesionMenu.style.display = 'block';
      tallerInfo.style.display = 'block';
      
      // Configurar cerrar sesión
      btnCerrarSesionMenu.onclick = function(e) {
        e.preventDefault();
        if (!confirm('¿Seguro que deseas salir del panel?')) return;
        cerrarSesion();
      };
      
    } else {
      // Sin sesión: mostrar botón Iniciar sesión, ocultar taller
      btnCerrarSesionMenu.style.display = 'none';
      tallerInfo.style.display = 'none';
      
      // Botón Iniciar sesión
      btnCerrarSesionMenu.onclick = function(e) {
        e.preventDefault();
        window.location.href = LOGIN_PAGE;
      };
    }
  }

  // ---------- Tabs ----------
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', function () {
      const target = tab.getAttribute('data-tab');
      tabs.forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === 'tab-' + target);
      });
    });
  });

  // =========================================================
  // PRODUCTOS
  // =========================================================
  const productoForm = document.getElementById('producto-form');
  const productoFormTitle = document.getElementById('producto-form-title');
  const btnNuevoProducto = document.getElementById('btn-nuevo-producto');
  const btnCancelarProducto = document.getElementById('btn-cancelar-producto');
  const listaProductos = document.getElementById('lista-productos');
  const productosVacio = document.getElementById('productos-vacio');
  const campoProductoId = document.getElementById('producto-id');
  const campoNombre = document.getElementById('producto-nombre');
  const campoCategoria = document.getElementById('producto-categoria');
  const campoColor = document.getElementById('producto-color');
  const campoPrecio = document.getElementById('producto-precio');
  const campoStock = document.getElementById('producto-Cantidad');
  const campoMaterial = document.getElementById('producto-material');
  const campoTallas = document.getElementById('producto-tallas');
  const campoDescripcion = document.getElementById('producto-descripcion');
  const campoDisponible = document.getElementById('producto-disponible');
  const campoImagenFile = document.getElementById('producto-imagen-file');
  const campoImagenUrl = document.getElementById('producto-imagen-url');
  const imagenPreview = document.getElementById('producto-imagen-preview');
  let imagenActual = '';
  function resetProductoForm() {
    productoForm.reset();
    campoProductoId.value = '';
    campoDisponible.checked = true;
    imagenActual = '';
    renderImagenPreview();
    productoFormTitle.textContent = 'Nuevo Producto';
  }
  function renderImagenPreview() {
    imagenPreview.innerHTML = imagenActual
      ? '<img src="' + imagenActual + '" alt="Vista previa">'
      : '<span class="image-placeholder-icon">🖼️</span>';
  }
  btnNuevoProducto.addEventListener('click', function () {
    resetProductoForm();
    // FORZAR RECARGA de categorías antes de mostrar el formulario
    poblarSelectCategoriasProducto();
    productoForm.hidden = false;
    campoNombre.focus();
  });
  btnCancelarProducto.addEventListener('click', function () {
    productoForm.hidden = true;
    resetProductoForm();
  });
  campoImagenFile.addEventListener('change', function () {
    const file = campoImagenFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      imagenActual = reader.result;
      campoImagenUrl.value = '';
      renderImagenPreview();
    };
    reader.readAsDataURL(file);
  });
  campoImagenUrl.addEventListener('input', function () {
    if (campoImagenUrl.value.trim()) {
      imagenActual = campoImagenUrl.value.trim();
      renderImagenPreview();
    }
  });
  productoForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = campoProductoId.value;
    const producto = {
      nombre: campoNombre.value.trim(),
      categoria: campoCategoria.value.trim(),
      color: campoColor.value.trim(),
      precio: Number(campoPrecio.value) || 0,
      stock: Number(campoStock.value) || 0,
      Cantidad: Number(campoStock.value) || 0,
      material: campoMaterial.value.trim(),
      tallas: campoTallas.value.trim(),
      descripcion: campoDescripcion.value.trim(),
      disponible: campoDisponible.checked,
      imagen: imagenActual,
    };
    try {
      if (id) await apiSend('productos.php?id=' + id, 'PUT', producto);
      else await apiSend('productos.php', 'POST', producto);
      await cargarProductos();
      productoForm.hidden = true;
      resetProductoForm();
      showToast('Guardado');
    } catch (err) { mostrarError(err); }
  });
  function editarProducto(id) {
    const producto = productos.find((p) => String(p.id) === String(id));
    if (!producto) return;
  // FORZAR RECARGA de categorías antes de llenar el formulario
  poblarSelectCategoriasProducto();
  campoProductoId.value = producto.id;
  campoNombre.value = producto.nombre;
  campoCategoria.value = producto.categoria;
  campoColor.value = producto.color || '';
    campoPrecio.value = producto.precio;
    campoStock.value = producto.stock ?? producto.Cantidad ?? '';
    campoMaterial.value = producto.material;
    campoTallas.value = producto.tallas;
    campoDescripcion.value = producto.descripcion;
    campoDisponible.checked = Boolean(Number(producto.disponible));
    campoImagenUrl.value = '';
    imagenActual = producto.imagen || '';
    renderImagenPreview();
    productoFormTitle.textContent = 'Editar Producto';
    productoForm.hidden = false;
    productoForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function eliminarProducto(id) { // Borra o desactiva si tiene pedidos (maneja FK 1451)
    const producto = productos.find((p) => String(p.id) === String(id));
    if (!producto) return;
    if (!confirm('¿Eliminar el producto "' + producto.nombre + '"?\nSi tiene pedidos, se desactivará en vez de borrarse.')) return;
    try {
      const resp = await apiSend('productos.php?id=' + id, 'DELETE');
      await cargarProductos();
      showToast(resp.mensaje || (resp.advertencia ? 'Producto desactivado' : 'Producto eliminado'));
    } catch (err) { mostrarError(err); }
  }
  let filtroCategoriaPanel = 'todos';

  function productosFiltradosPanel() {
    if (filtroCategoriaPanel === 'todos') return productos;
    return productos.filter((p) => (p.categoria || '').toLowerCase() === filtroCategoriaPanel.toLowerCase());
  }

  function poblarFiltroCategoriasPanel() {
    const select = document.getElementById('panelFiltroCategoria');
    if (!select) return;
    const cats = obtenerCategorias();
    let html = '<option value="todos">Todas las categorías</option>';
    cats.forEach((cat) => {
      html += '<option value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</option>';
    });
    select.innerHTML = html;
    select.onchange = function () {
      filtroCategoriaPanel = this.value;
      renderProductos();
    };
  }

  function renderProductos() {
    listaProductos.innerHTML = '';
    const lista = productosFiltradosPanel();
    if (productos.length === 0) { productosVacio.hidden = false; return; }
    productosVacio.hidden = true;
    if (lista.length === 0) {
      listaProductos.innerHTML = '<p class="empty-state">No hay productos en esta categoría.</p>';
      return;
    }
    lista.forEach((producto) => {
      const disponible = Boolean(Number(producto.disponible));
      const item = document.createElement('div');
      item.className = 'producto-item';
      const thumb = document.createElement('div');
      thumb.className = 'producto-thumb';
      thumb.innerHTML = producto.imagen ? '<img src="' + producto.imagen + '" alt="' + escapeHtml(producto.nombre) + '">' : '👕';
      const info = document.createElement('div');
      info.className = 'producto-info';
      const stockVal = producto.stock ?? producto.Cantidad ?? 0;
      info.innerHTML =
        '<div class="producto-nombre">' + escapeHtml(producto.nombre) + '</div>' +
        '<div class="producto-precio">' + formatPrecio(producto.precio) + '</div>' +
        '<div class="badges">' +
        '<span class="badge ' + (disponible ? 'badge-activo' : 'badge-inactivo') + '">' + (disponible ? 'Activo' : 'Inactivo') + '</span>' +
        '<span class="badge">Cantidad: ' + stockVal + '</span>' +
        (producto.color ? '<span class="badge">🎨 ' + escapeHtml(producto.color) + '</span>' : '') +
        '</div>';
      const actions = document.createElement('div');
      actions.className = 'producto-actions';
      const btnEditar = document.createElement('button');
      btnEditar.type = 'button'; btnEditar.className = 'btn btn-outline btn-sm'; btnEditar.textContent = 'Editar';
      btnEditar.addEventListener('click', () => editarProducto(producto.id));
      const btnEliminar = document.createElement('button');
      btnEliminar.type = 'button'; btnEliminar.className = 'btn-icon-danger'; btnEliminar.title = 'Eliminar';
      btnEliminar.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
      btnEliminar.addEventListener('click', () => eliminarProducto(producto.id));
      actions.appendChild(btnEditar); actions.appendChild(btnEliminar);
      item.appendChild(thumb); item.appendChild(info); item.appendChild(actions);
      listaProductos.appendChild(item);
    });
  }
  async function cargarProductos() {
    try { productos = await apiGet('productos.php'); renderProductos(); } catch (err) { mostrarError(err); }
  }

  // =========================================================
  // PEDIDOS / SOLICITUDES
  // =========================================================
  const listaPedidos = document.getElementById('lista-pedidos');
  const pedidosVacio = document.getElementById('pedidos-vacio');

  async function aceptarSolicitud(id, codigo) {
    if (!codigo || !codigo.trim()) { showToast('⚠️ Escribe un código de verificación'); return; }
    try {
      await apiSend('pedidos.php?id=' + id, 'PATCH', { accion: 'aceptar', codigo: codigo.trim() });
      await cargarPedidos();
      showToast('✅ Solicitud aceptada con código ' + codigo.trim());
    } catch (err) { mostrarError(err); }
  }
  async function rechazarSolicitud(id) {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    try {
      await apiSend('pedidos.php?id=' + id, 'PATCH', { accion: 'rechazar' });
      await cargarPedidos();
      showToast('Solicitud rechazada');
    } catch (err) { mostrarError(err); }
  }

  // Filtros y agrupado
  let filtroActual = 'todos';
  let agruparPedidos = false;
  const resumenClientesEl = document.getElementById('resumen-clientes');
  document.querySelectorAll('.filtro-pedido').forEach(btn=>{
    btn.addEventListener('click', function(){
      document.querySelectorAll('.filtro-pedido').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      filtroActual = btn.dataset.filtro;
      renderPedidos();
    });
  });
  const chkAgrupar = document.getElementById('chkAgruparPedidos');
  if(chkAgrupar) chkAgrupar.addEventListener('change', function(){ agruparPedidos = chkAgrupar.checked; renderPedidos(); });

  function renderPedidoCard(pedido){
    const estadoRaw = (pedido.estado || 'Pendiente').trim();
    const estadoLow = estadoRaw.toLowerCase();
    const esPendiente = estadoLow === 'pendiente';
    const esAceptada = estadoLow.startsWith('aceptada') || estadoLow === 'confirmado';
    const esRechazada = estadoLow.startsWith('rechazada');
    const esExpirado = estadoLow === 'expirado' || estadoLow === 'expirada';
    const esCancelado = estadoLow === 'cancelado';
    let badgeClass = 'badge-pendiente';
    if (esAceptada) badgeClass='badge-confirmado';
    if (esRechazada) badgeClass='badge-rechazada';
    if (esExpirado) badgeClass='badge-rechazada';
    const codigo = pedido.codigo_verificacion || '';
    const whatsappNum = pedido.whatsapp || pedido.telefono || '';
    const telefonoShow = escapeHtml(pedido.telefono || '');
    const whatsappShow = escapeHtml(whatsappNum || '');
    const waDigitsRaw = String(whatsappNum||'').replace(/\D/g,'');
    let waDigits = waDigitsRaw;
    if(waDigitsRaw.length===10 && waDigitsRaw.startsWith('3')) waDigits = '57'+waDigitsRaw;
    const waLinkUsuario = waDigits ? 'https://wa.me/'+ encodeURIComponent(waDigits) + '?text=' + encodeURIComponent('Hola '+(pedido.nombre||'')+', soy admin de Costuras & Modas. Solicitud #'+pedido.id+' ('+estadoRaw+')'+(codigo? ' código: '+codigo : '')+' ') : '';
    const btnWhatsappAdmin = waDigits ? '<a href="'+waLinkUsuario+'" target="_blank" class="btn btn-sm" style="background:#25D366;color:white;border:none;">💬 WhatsApp ('+whatsappShow+')</a>' : '<span class="badge">Sin WhatsApp</span>';
    const metodo = escapeHtml(pedido.metodo_pago||'contraentrega');
    const anticipo = pedido.anticipo_monto ? formatPrecio(pedido.anticipo_monto) : '';
    const diasRest = pedido.dias_restantes!=null ? pedido.dias_restantes : null;
    const expiraTxt = pedido.expira ? formatFecha(pedido.expira) : '';
    const tiempoTxt = diasRest!=null ? (diasRest<=0?'⚠️ Venció': '⏳ '+diasRest+' días') : '';
    const items = pedido.items || [];
    const itemsHtml = items.length ? '<div style="margin:6px 0;font-size:12px;">'+items.map(it=> '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #E8E0E6;padding:3px 0;"><span>'+escapeHtml(it.producto_nombre||'Prod')+' x'+it.cantidad+'</span><span>'+formatPrecio(it.precio_unitario*it.cantidad)+'</span></div>').join('')+'</div>' : '';
    const item = document.createElement('div');
    item.className = 'pedido-item';
    item.innerHTML =
      '<div class="pedido-top">' +
        '<div>' +
          '<div class="pedido-id">Solicitud #' + String(pedido.id) + ' <small style="color:#7A7079;">• '+metodo+(anticipo?' • Anticipo '+anticipo:'')+'</small></div>' +
          '<div class="pedido-cliente">👤 ' + escapeHtml(pedido.nombre||'') + ' ' + escapeHtml(pedido.apellido||'') + ' • 📱 ' + telefonoShow + '</div>' +
          '<div class="pedido-direccion">📍 ' + escapeHtml(pedido.direccion||'') + ', ' + escapeHtml(pedido.ciudad||'') + ', ' + escapeHtml(pedido.departamento||'') + '</div>' +
          (pedido.usuario && pedido.usuario.email ? '<div class="pedido-meta">📧 '+escapeHtml(pedido.usuario.email)+' • ID:'+escapeHtml(String(pedido.usuario_id))+'</div>' : (pedido.usuario_id ? '<div class="pedido-meta">ID usuario: '+escapeHtml(String(pedido.usuario_id))+'</div>' : '')) +
        '</div>' +
        '<div class="pedido-right">' +
          '<div class="pedido-total">' + formatPrecio(pedido.total) + '</div>' +
          '<span class="badge ' + badgeClass + '">' + escapeHtml(estadoRaw) + '</span>' +
          (tiempoTxt ? '<div style="font-size:11px;color:#7A7079;margin-top:4px;">'+tiempoTxt+(expiraTxt?' • '+expiraTxt:'')+'</div>' : '') +
          (esAceptada && codigo ? '<div class="pedido-codigo">Código: <strong>' + escapeHtml(codigo) + '</strong></div>' : '') +
        '</div>' +
      '</div>' +
      itemsHtml +
      '<div style="margin-bottom:8px;">' + btnWhatsappAdmin + '</div>' +
      (esPendiente
        ? '<div class="pedido-acciones">' +
            '<input type="text" class="input-codigo" placeholder="Código CYM-123" maxlength="30">' +
            '<button type="button" class="btn btn-primary btn-sm btn-aceptar">✓ Aceptar</button>' +
            '<button type="button" class="btn btn-outline btn-sm btn-rechazar">✕ Rechazar</button>' +
          '</div>'
        : esAceptada ? '<div class="pedido-aceptada-info">✅ Aceptada — Código: <strong>' + escapeHtml(codigo || '—') + '</strong></div>'
        : esExpirado ? '<div class="pedido-rechazada-info">⌛ Expirada (1-2 semanas sin confirmar)</div>'
        : esCancelado ? '<div class="pedido-rechazada-info">🚫 Cancelada por usuario</div>'
        : esRechazada ? '<div class="pedido-rechazada-info">❌ Rechazada</div>' : ''
      );
    if (esPendiente) {
      const inputCod = item.querySelector('.input-codigo');
      const btnAceptar = item.querySelector('.btn-aceptar');
      const btnRechazar = item.querySelector('.btn-rechazar');
      btnAceptar.addEventListener('click', ()=> aceptarSolicitud(pedido.id, inputCod.value));
      btnRechazar.addEventListener('click', ()=> rechazarSolicitud(pedido.id));
    }
    return item;
  }

  function renderPedidos() {
    listaPedidos.innerHTML = '';
    if(resumenClientesEl) resumenClientesEl.style.display='none';
    if (pedidos.length === 0) { pedidosVacio.hidden = false; return; }
    pedidosVacio.hidden = true;
    let lista = pedidos.slice().sort((a,b)=> new Date(b.fecha)-new Date(a.fecha));
    // Filtro
    if(filtroActual!=='todos'){
      lista = lista.filter(p=> (p.estado||'').toLowerCase().includes(filtroActual));
    }
    if(lista.length===0){
      listaPedidos.innerHTML='<p class="empty-state">No hay pedidos con filtro "'+escapeHtml(filtroActual)+'"</p>';
      return;
    }
    // Agrupar por cliente
    if(agruparPedidos){
      const grupos={};
      lista.forEach(p=>{
        const key = p.usuario_id ? 'uid_'+p.usuario_id : (p.usuario && p.usuario.email ? p.usuario.email : p.telefono||p.whatsapp||'sin-id')+'_'+p.nombre;
        if(!grupos[key]) grupos[key]=[];
        grupos[key].push(p);
      });
      const htmlGrupos = Object.entries(grupos).map(([key, arr])=>{
        const total = arr.reduce((s,x)=> s + (parseFloat(x.total)||0),0);
        const pendientes = arr.filter(x=> (x.estado||'').toLowerCase()==='pendiente');
        const info = arr[0];
        const nombre = escapeHtml(info.nombre+' '+(info.apellido||''));
        const tel = escapeHtml(info.telefono||info.whatsapp||'');
        const email = info.usuario ? escapeHtml(info.usuario.email||'') : '—';
        const dir = escapeHtml(info.direccion+', '+info.ciudad);
        const header = '<div style="background:#FBF7F9;border:1px solid #E8E0E6;border-radius:12px;padding:12px;margin-bottom:12px;">'
          +'<strong>👤 '+nombre+' • 📱 '+tel+' • 📧 '+email+'</strong><br>'
          +'<small style="color:#7A7079;">📍 '+dir+' • Pedidos: '+arr.length+' • Total: '+formatPrecio(total)+' • Pendientes: '+pendientes.length+'</small>'
          + (pendientes.length ? '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;"><input type="text" class="input-codigo" placeholder="Código para todos pendientes" style="max-width:160px;" data-grupo="'+key+'"><button class="btn btn-primary btn-sm btn-aceptar-grupo" data-grupo="'+key+'">✓ Aceptar todos pendientes ('+pendientes.length+')</button><button class="btn btn-outline btn-sm btn-rechazar-grupo" data-grupo="'+key+'">✕ Rechazar todos</button></div>' : '')
          +'</div>';
        const items = arr.map(p=> renderPedidoCard(p).outerHTML).join('');
        return header + items;
      }).join('<hr style="border:none;border-top:1px dashed #E8E0E6;margin:16px 0;">');
      listaPedidos.innerHTML = htmlGrupos;
      // listeners grupo
      listaPedidos.querySelectorAll('.btn-aceptar-grupo').forEach(btn=>{
        btn.addEventListener('click', async function(){
          const key=btn.dataset.grupo;
          const input=listaPedidos.querySelector('.input-codigo[data-grupo="'+key+'"]');
          const cod=(input?input.value:'').trim();
          if(!cod){ showToast('Escribe código para el grupo'); return; }
          const grupo = grupos[key].filter(x=> (x.estado||'').toLowerCase()==='pendiente');
          for(const p of grupo){ await apiSend('pedidos.php?id='+p.id,'PATCH',{accion:'aceptar', codigo: cod}); }
          await cargarPedidos();
          showToast('Aceptadas '+grupo.length+' solicitudes');
        });
      });
      listaPedidos.querySelectorAll('.btn-rechazar-grupo').forEach(btn=>{
        btn.addEventListener('click', async function(){
          if(!confirm('¿Rechazar todas las pendientes de este cliente?')) return;
          const key=btn.dataset.grupo;
          const grupo = grupos[key].filter(x=> (x.estado||'').toLowerCase()==='pendiente');
          for(const p of grupo){ await apiSend('pedidos.php?id='+p.id,'PATCH',{accion:'rechazar'}); }
          await cargarPedidos();
          showToast('Rechazadas '+grupo.length);
        });
      });
      // resumen clientes arriba
      if(resumenClientesEl){
        resumenClientesEl.style.display='block';
        resumenClientesEl.innerHTML = '<div style="background:white;border:1px solid #E8E0E6;border-radius:10px;padding:10px;font-size:12px;">Clientes únicos: '+Object.keys(grupos).length+' • Pedidos totales: '+lista.length+' • Pendientes: '+lista.filter(p=> (p.estado||'').toLowerCase()==='pendiente').length+' • Expirados: '+lista.filter(p=> (p.estado||'').toLowerCase()==='expirado').length+'</div>';
      }
      // vuelve a enganchar botones individuales que se perdieron al usar outerHTML -> rehacer con DOM
      listaPedidos.innerHTML = '';
      // reconstruir agrupado con nodos reales para listeners individuales
      Object.entries(grupos).forEach(([key, arr])=>{
        const header = document.createElement('div');
        header.style.cssText='background:#FBF7F9;border:1px solid #E8E0E6;border-radius:12px;padding:12px;margin-bottom:12px;';
        const total = arr.reduce((s,x)=> s + (parseFloat(x.total)||0),0);
        const pendientes = arr.filter(x=> (x.estado||'').toLowerCase()==='pendiente');
        const info = arr[0];
        header.innerHTML = '<strong>👤 '+escapeHtml(info.nombre+' '+(info.apellido||''))+' • 📱 '+escapeHtml(info.telefono||'')+' • 📧 '+(info.usuario?escapeHtml(info.usuario.email||'—'):'—')+'</strong><br>'
          +'<small style="color:#7A7079;">📍 '+escapeHtml(info.direccion+', '+info.ciudad)+' • Pedidos: '+arr.length+' • Total: '+formatPrecio(total)+'</small>';
        if(pendientes.length){
          const row=document.createElement('div');
          row.style.cssText='margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;';
          const inp=document.createElement('input'); inp.type='text'; inp.placeholder='Código para todos'; inp.className='input-codigo'; inp.style.maxWidth='160px';
          const bA=document.createElement('button'); bA.className='btn btn-primary btn-sm'; bA.textContent='✓ Aceptar todos ('+pendientes.length+')';
          bA.addEventListener('click', async function(){
            const cod=inp.value.trim();
            if(!cod){ showToast('Escribe código'); return; }
            for(const p of pendientes){ await apiSend('pedidos.php?id='+p.id,'PATCH',{accion:'aceptar', codigo: cod}); }
            await cargarPedidos(); showToast('Aceptadas '+pendientes.length);
          });
          const bR=document.createElement('button'); bR.className='btn btn-outline btn-sm'; bR.textContent='✕ Rechazar todos';
          bR.addEventListener('click', async function(){
            if(!confirm('¿Rechazar todas?')) return;
            for(const p of pendientes){ await apiSend('pedidos.php?id='+p.id,'PATCH',{accion:'rechazar'}); }
            await cargarPedidos(); showToast('Rechazadas');
          });
          row.appendChild(inp); row.appendChild(bA); row.appendChild(bR);
          header.appendChild(row);
        }
        listaPedidos.appendChild(header);
        arr.forEach(p=> listaPedidos.appendChild(renderPedidoCard(p)));
        const hr=document.createElement('hr'); hr.style.cssText='border:none;border-top:1px dashed #E8E0E6;margin:16px 0;'; listaPedidos.appendChild(hr);
      });
      return;
    }
    // Lista plana
    lista.forEach(p=> listaPedidos.appendChild(renderPedidoCard(p)));
  }
  async function cargarPedidos() {
    try { pedidos = await apiGet('pedidos.php?con_items=1'); renderPedidos(); } catch (err) { mostrarError(err); }
  }

  // =========================================================
  // CONFIG
  // =========================================================
  const configLogoFile = document.getElementById('config-logo-file');
  const configLogoFile2 = document.getElementById('config-logo-file-2');
  const configLogoPreview = document.getElementById('config-logo-preview');
  const configLogoPlaceholder = document.getElementById('config-logo-placeholder');
  const configFrase = document.getElementById('config-frase');
  const configNombreEmpresa = document.getElementById('config-nombre-empresa');
  const configWhatsapp = document.getElementById('config-whatsapp');
  const configTiendaDisponible = document.getElementById('config-tienda-disponible');
  const configHorarioApertura = document.getElementById('config-horario-apertura');
  const configHorarioCierre = document.getElementById('config-horario-cierre');
  const configHorarioDias = document.getElementById('config-horario-dias');
  const configDireccionTaller = document.getElementById('config-direccion-taller');
  const configFotoTallerFile = document.getElementById('config-foto-taller-file');
  const configFotoTallerUrl = document.getElementById('config-foto-taller-url');
  const tallerFotoPreview = document.getElementById('taller-foto-preview');
  const configTelefonoTaller = document.getElementById('config-telefono-taller');
  const configNequi = document.getElementById('config-nequi');
  const configAnticipoValor = document.getElementById('config-anticipo-valor');
  const configTiempoEspera = document.getElementById('config-tiempo-espera');
  const configTerminos = document.getElementById('config-terminos');
  const configUsuarioAdmin = document.getElementById('config-usuario-admin');
  const configPassword = document.getElementById('config-password');
  const btnGuardarConfig = document.getElementById('btn-guardar-config');
  const horarioPreview = document.getElementById('horario-preview');
  let fotoTallerActual = '';

  function actualizarPreviewHorario(){
    if(!horarioPreview) return;
    const ap = configHorarioApertura.value || config.horarioApertura || '08:00';
    const ci = configHorarioCierre.value || config.horarioCierre || '18:00';
    const dias = configHorarioDias.value || config.horarioDias || '';
    horarioPreview.textContent = 'Vista previa: ' + (dias? dias+' · ':'') + ap + ' - ' + ci + (configTiendaDisponible.checked ? '  (Abierto según horario)' : '  (Forzado cerrado)');
  }

  function fillConfigForm() {
    actualizarFaviconYTitle();
    renderLogoPreview();
    renderTallerFotoPreview();
    configFrase.value = config.frase || '';
    configNombreEmpresa.value = config.nombreEmpresa || '';
    configWhatsapp.value = config.whatsapp || '';
    configTiendaDisponible.checked = String(config.tiendaDisponible ?? config.tienda_disponible ?? '1') === '1';
    configHorarioApertura.value = config.horarioApertura || config.horario_apertura || '08:00';
    configHorarioCierre.value = config.horarioCierre || config.horario_cierre || '18:00';
    configHorarioDias.value = config.horarioDias || config.horario_dias || 'Lunes a Sábado';
    configDireccionTaller.value = config.direccionTaller || config.direccion_taller || '';
    fotoTallerActual = config.fotoTaller || config.foto_taller || '';
    renderTallerFotoPreview();
    configFotoTallerUrl.value = '';
    configTelefonoTaller.value = config.telefonoTaller || config.telefono_taller || '';
    configNequi.value = config.nequi || '';
    configAnticipoValor.value = config.anticipoValor || config.anticipo_valor || '40000';
    configTiempoEspera.value = config.tiempoEsperaDias || config.tiempo_espera_dias || config.tiempoEspera || '10';
    configTerminos.value = config.terminosCondiciones || config.terminos_condiciones || config.terminos || '';
    configUsuarioAdmin.value = config.adminUsuario || 'admin';
    configPassword.value = '';
    actualizarPreviewHorario();
  }
  function renderLogoPreview() {
    if (config.logo) {
      configLogoPreview.src = config.logo;
      configLogoPreview.hidden = false;
      configLogoPlaceholder.hidden = true;
    } else {
      configLogoPreview.hidden = true;
      configLogoPlaceholder.hidden = false;
    }
  }
  function renderTallerFotoPreview(){
    if(tallerFotoPreview){
      if(fotoTallerActual){
        tallerFotoPreview.innerHTML = '<img src="'+fotoTallerActual+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
      } else {
        tallerFotoPreview.innerHTML = '<span class="image-placeholder-icon">🏠</span>';
      }
    }
  }
  async function guardarConfigClave(clave, valor) {
    config[clave] = valor;
    try { await apiSend('configuracion.php', 'POST', { [clave]: valor }); showToast('Guardado'); } catch (err) { mostrarError(err); }
  }
  function handleLogoFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      configLogoPreview.src = reader.result;
      configLogoPreview.hidden = false;
      configLogoPlaceholder.hidden = true;
      actualizarFaviconYTitle(); // previsualiza favicon al instante
      // actualiza favicon inmediato antes de guardar
      try{ let l=document.getElementById('favicon'); if(l) l.href=reader.result; }catch(e){}
      guardarConfigClave('logo', reader.result);
    };
    reader.readAsDataURL(file);
  }
  function handleTallerFotoFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      fotoTallerActual = reader.result;
      renderTallerFotoPreview();
      guardarConfigClave('fotoTaller', reader.result);
    };
    reader.readAsDataURL(file);
  }
  configLogoFile.addEventListener('change', () => handleLogoFile(configLogoFile.files[0]));
  configLogoFile2.addEventListener('change', () => handleLogoFile(configLogoFile2.files[0]));
  if(configFotoTallerFile) configFotoTallerFile.addEventListener('change', () => handleTallerFotoFile(configFotoTallerFile.files[0]));
  if(configFotoTallerUrl) configFotoTallerUrl.addEventListener('blur', function(){ if(this.value.trim()){ fotoTallerActual = this.value.trim(); renderTallerFotoPreview(); guardarConfigClave('fotoTaller', fotoTallerActual); }});
  if(configFotoTallerUrl) configFotoTallerUrl.addEventListener('change', function(){ if(this.value.trim()){ fotoTallerActual = this.value.trim(); renderTallerFotoPreview(); }});
  function autosave(input, key) {
    if(!input) return;
    input.addEventListener('blur', function () { guardarConfigClave(key, input.value.trim()); });
  }
  autosave(configFrase, 'frase');
  autosave(configNombreEmpresa, 'nombreEmpresa');
  autosave(configWhatsapp, 'whatsapp');
  autosave(configHorarioDias, 'horarioDias');
  autosave(configDireccionTaller, 'direccionTaller');
  autosave(configTelefonoTaller, 'telefonoTaller');
  autosave(configNequi, 'nequi');
  autosave(configAnticipoValor, 'anticipoValor');
  autosave(configTiempoEspera, 'tiempoEsperaDias');
  autosave(configTerminos, 'terminosCondiciones');
  autosave(configUsuarioAdmin, 'adminUsuario');
  configTiendaDisponible.addEventListener('change', function () {
    guardarConfigClave('tiendaDisponible', configTiendaDisponible.checked ? '1' : '0');
    actualizarPreviewHorario();
  });
  configHorarioApertura.addEventListener('change', function(){ guardarConfigClave('horarioApertura', configHorarioApertura.value); actualizarPreviewHorario(); });
  configHorarioCierre.addEventListener('change', function(){ guardarConfigClave('horarioCierre', configHorarioCierre.value); actualizarPreviewHorario(); });
  configHorarioDias.addEventListener('input', actualizarPreviewHorario);
  configPassword.addEventListener('blur', function () {
    if (configPassword.value.trim()) guardarConfigClave('adminPassword', configPassword.value.trim());
  });
  btnGuardarConfig.addEventListener('click', async function () {
    const datos = {
      frase: configFrase.value.trim(),
      nombreEmpresa: configNombreEmpresa.value.trim(),
      whatsapp: configWhatsapp.value.trim(),
      tiendaDisponible: configTiendaDisponible.checked ? '1' : '0',
      horarioApertura: configHorarioApertura.value || '08:00',
      horarioCierre: configHorarioCierre.value || '18:00',
      horarioDias: configHorarioDias.value.trim() || 'Lunes a Sábado',
      direccionTaller: configDireccionTaller.value.trim(),
      fotoTaller: fotoTallerActual || '',
      telefonoTaller: configTelefonoTaller.value.trim(),
      nequi: configNequi.value.trim(),
      anticipoValor: configAnticipoValor.value.trim() || '40000',
      tiempoEsperaDias: configTiempoEspera.value.trim() || '10',
      terminosCondiciones: configTerminos.value.trim(),
      adminUsuario: configUsuarioAdmin.value.trim() || 'admin',
      categoriasProductos: config.categoriasProductos || DEFAULT_CONFIG.categoriasProductos,
    };
    if (configPassword.value.trim()) datos.adminPassword = configPassword.value.trim();
    try {
      await apiSend('configuracion.php', 'POST', datos);
      Object.assign(config, datos);
      showToast('Configuración guardada');
      // Actualizar también el DEFAULT_CONFIG para que se refleje en el panel
      DEFAULT_CONFIG.categoriasProductos = datos.categoriasProductos;
      fillConfigForm();
    } catch (err) { mostrarError(err); }
  });
  async function cargarConfig() {
    try {
      const datos = await apiGet('configuracion.php');
      config = Object.assign({}, DEFAULT_CONFIG, datos);
      if (datos.tienda_disponible !== undefined && datos.tiendaDisponible === undefined) config.tiendaDisponible = datos.tienda_disponible;
      if (datos.horario_apertura !== undefined) config.horarioApertura = datos.horario_apertura;
      if (datos.horario_cierre !== undefined) config.horarioCierre = datos.horario_cierre;
      if (datos.horario_dias !== undefined) config.horarioDias = datos.horario_dias;
      if (typeof config.categoriasProductos === 'string') {
        try { config.categoriasProductos = JSON.parse(config.categoriasProductos); } catch(e) { config.categoriasProductos = []; }
      }
      if (!Array.isArray(config.categoriasProductos)) config.categoriasProductos = [];
      fillConfigForm();
      cargarYRenderizarCategorias();
      poblarSelectCategoriasProducto();
      poblarFiltroCategoriasPanel();
    } catch (err) { mostrarError(err); }
  }

  function obtenerCategorias() {
    let cats = config.categoriasProductos || DEFAULT_CONFIG.categoriasProductos;
    if (typeof cats === 'string') {
      try { cats = JSON.parse(cats); } catch(e) { cats = []; }
    }
    if (!Array.isArray(cats)) cats = [];
    return cats;
  }

function poblarSelectCategoriasProducto() {
  const select = document.getElementById('producto-categoria');
  if (!select) return;
  const categorias = obtenerCategorias();
  let html = '<option value="" disabled selected>Selecciona tipo</option>';
  categorias.forEach((cat) => {
    html += '<option value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</option>';
  });
  select.innerHTML = html;
}

// NUEVA: Forzar recargar categorías en el selector del formulario producto
window.forceRefreshCategoriasProducto = function() {
  poblarSelectCategoriasProducto();
  showToast('Categorías actualizadas');
}

  function cargarYRenderizarCategorias() {
    const categorias = obtenerCategorias();
    const listaEl = document.getElementById('lista-categorias');
    if (!listaEl) return;

    if (categorias.length === 0) {
      listaEl.innerHTML = '<p style="color:#7A7079; font-size:12px;">No hay categorías definidas. Agrega nuevas arriba.</p>';
      poblarSelectCategoriasProducto();
      return;
    }

    let html = '';
    categorias.forEach((cat) => {
      html += '<span class="badge badge-activo" style="margin-right: 6px; margin-bottom: 6px; font-size: 12px; padding: 4px 8px; border-radius: 12px; background: #F0567A; color: white;">' + escapeHtml(cat) + '</span>';
      html += '<button class="btn btn-outline btn-sm" style="margin-left: 4px; padding: 2px 6px; font-size: 11px;" onclick="eliminarCategoria(\'' + cat + '\')">×</button>';
    });
    listaEl.innerHTML = html;
    poblarSelectCategoriasProducto();
  }

  async function guardarCategorias() {
    try {
      await apiSend('configuracion.php', 'POST', { categoriasProductos: config.categoriasProductos || DEFAULT_CONFIG.categoriasProductos });
      DEFAULT_CONFIG.categoriasProductos = config.categoriasProductos;
    } catch (err) { mostrarError(err); }
  }

  window.eliminarCategoria = function(cat) {
    if (!confirm('¿Eliminar la categoría "' + cat + '"?')) return;
    config.categoriasProductos = obtenerCategorias().filter(c => c !== cat);
    cargarYRenderizarCategorias();
    guardarCategorias();
  };

  window.agregarCategoria = function() {
    const input = document.getElementById('nueva-categoria');
    const nombre = input ? input.value.trim() : '';
    if (!nombre) { showToast('Ingresa un nombre de categoría'); return; }
    const existentes = obtenerCategorias().map(c => c.toLowerCase());
    if (existentes.some(c => c === nombre.toLowerCase())) {
      showToast('Esa categoría ya existe');
      return;
    }
    config.categoriasProductos = obtenerCategorias().concat(nombre);
    cargarYRenderizarCategorias();
    guardarCategorias();
    if (input) input.value = '';
  };

  cargarProductos();
  cargarPedidos();
  cargarConfig();
  // Renderizar menú según estado de sesión
  renderMenu();
  })();
