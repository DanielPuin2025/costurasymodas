/* =========================================================
   Costuras & Modas — Tienda
   Nuevo flujo: Solicitud con código WhatsApp admin
   ========================================================= */

(function () {
  'use strict';

  const API_CANDIDATES = ['../backend/api/','backend/api/','api/',''];
  const LS_CARRITO = 'cym_carrito';
  const LS_USER_SESSION = 'cym_user_session';
  const LOGIN_PAGE = 'costuras_y_modas.html';

  async function fetchWithFallback(path, options){
    let lastRes=null, lastErr=null;
    for(const base of API_CANDIDATES){
      try{
        const res = await fetch(base + path, options);
        if(res.status===404 && base==='api/') { lastRes=res; continue; }
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
    if (!res.ok) throw new Error(json.error || 'Error '+res.status);
    return json;
  }
  function loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function formatPrecio(value) { const n = Number(value) || 0; return '$' + n.toLocaleString('es-CO'); }
  function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str == null ? '' : String(str); return div.innerHTML; }
  function formatFecha(iso) {
    try { const d=new Date(iso); return d.toLocaleString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});} catch(e){return '';}
  }

  let productos = [];
  let carrito = loadJSON(LS_CARRITO, []);
  let categoriaActiva = 'todos';
  let colorActiva = 'todos';
  let terminoBusqueda = '';
  let configTienda = { whatsapp:'', tiendaDisponible:'1', horarioApertura:'08:00', horarioCierre:'18:00', horarioDias:'Lunes a Sábado' };

  const EMOJIS_POR_CATEGORIA = { Camisas: '👕', Pantalones: '👖', Chaquetas: '🧥', Uniformes: '👔', Overoles: '🦺', Ofertas: '🔥' };
  function emojiProducto(categoria) { const key=(categoria||'').toLowerCase(); return EMOJIS_POR_CATEGORIA[key] || '🧵'; }

  let toastTimer=null;
  window.showToast=function(message){
    const toast=document.getElementById('toast'); if(!toast) return;
    toast.textContent=message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),3000);
  };
  function mostrarErrorConexion(err){ console.error(err); showToast('⚠️ '+(err.message||'Error de conexión.')); }

  // ---------- Carga config tienda ----------
  async function cargarConfigTienda(){ // Trae WhatsApp, horario, taller, nequi y terminos
    try{
      const c=await apiGet('configuracion.php');
      configTienda.whatsapp=c.whatsapp||'';
      configTienda.horarioApertura=c.horarioApertura||c.horario_apertura||'08:00';
      configTienda.horarioCierre=c.horarioCierre||c.horario_cierre||'18:00';
      configTienda.horarioDias=c.horarioDias||c.horario_dias||'Lunes a Sábado';
      configTienda.direccionTaller=c.direccionTaller||c.direccion_taller||'Taller Costuras y Modas';
      configTienda.fotoTaller=c.fotoTaller||c.foto_taller||'';
      configTienda.telefonoTaller=c.telefonoTaller||c.telefono_taller||c.whatsapp||'';
      configTienda.nequi=c.nequi||'';
      configTienda.anticipoValor=c.anticipoValor||c.anticipo_valor||'40000';
      configTienda.tiempoEsperaDias=c.tiempoEsperaDias||c.tiempo_espera_dias||'10';
      configTienda.terminos=c.terminosCondiciones||c.terminos_condiciones||c.terminos||'';
      configTienda.categorias = c.categoriasProductos || c.categorias || [];
      configTienda.nombreEmpresa=c.nombreEmpresa||'Costuras y Modas';
      configTienda.logo=c.logo||'';
      if(c.nombreEmpresa){
        const h1=document.querySelector('.header-title h1');
        if(h1) h1.textContent=c.nombreEmpresa;
        document.title = c.nombreEmpresa + ' - Tienda';
      }
      // favicon dinámico (se cambia desde el panel admin)
      try{
        let fav=document.getElementById('favicon');
        if(!fav){ fav=document.createElement('link'); fav.id='favicon'; fav.rel='icon'; fav.type='image/png'; document.head.appendChild(fav); }
        if(c.logo) fav.href=c.logo;
        else fav.href='logo.png';
        let fav2=document.querySelector('link[rel="shortcut icon"]');
        if(fav2) fav2.href=fav.href;
      }catch(e){}
      const termTienda=document.getElementById('terminosTextoTienda');
      if(termTienda) termTienda.textContent=configTienda.terminos||'';
      // metodo pago help
      actualizarPagoHelp();
      poblarSelectCategorias();
    }catch(e){ console.error(e); }
  }
  function actualizarPagoHelp(){
    const sel=document.getElementById('checkoutMetodoPago');
    const help=document.getElementById('checkoutPagoHelp');
    if(!sel) return;
    const val=sel.value;
    const recogeCampos=document.getElementById('recogeTallerCampos');
    if(recogeCampos) recogeCampos.style.display = (val==='recoger_taller')?'block':'none';
    if(help){
      if(val==='contraentrega') help.textContent='Contraentrega por Nequi: pagarás '+formatPrecio(configTienda.anticipoValor)+' como anticipo vía Nequi ('+(configTienda.nequi||'—')+'). El resto al recibir.';
      else if(val==='recoger_taller') help.textContent='Recoger y pagar en el Taller: indica quién irá a recoger, su número y la fecha estimada (máximo 10 días desde hoy).';
    }
  }
  document.getElementById('checkoutMetodoPago')?.addEventListener('change', actualizarPagoHelp);

  // ---------- Productos ----------
  const productsGrid=document.getElementById('productsGrid'); // Contenedor de cards
  function productosFiltrados(){ // Filtra por categoría, color y búsqueda
    return productos.filter((p)=>{
      const coincideCategoria=categoriaActiva==='todos'||(p.categoria||'').toLowerCase()===categoriaActiva.toLowerCase();
      const coincideColor=colorActiva==='todos'||(p.color||'').toLowerCase()===colorActiva.toLowerCase();
      const coincideBusqueda=!terminoBusqueda||(p.nombre||'').toLowerCase().includes(terminoBusqueda);
      return coincideCategoria && coincideColor && coincideBusqueda;
    });
  }
  function stockBadge(stock){
    stock=Number(stock);
    if(stock<=0) return '<span class="stock-badge in-stock">Sobre pedido • Disponible</span>';
    if(stock<=10) return '<span class="stock-badge low-stock">¡Últimas '+stock+'!</span>';
    return '<span class="stock-badge in-stock">Disponible ('+stock+')</span>';
  }
  let ordenActual = 'populares';

  function ordenarProductos(lista) {
    const arr = [...lista];
    if (ordenActual === 'precio_asc') arr.sort((a,b) => (Number(a.precio)||0) - (Number(b.precio)||0));
    else if (ordenActual === 'precio_desc') arr.sort((a,b) => (Number(b.precio)||0) - (Number(a.precio)||0));
    else if (ordenActual === 'nuevos') arr.sort((a,b) => new Date(b.creado_en||0) - new Date(a.creado_en||0));
    else arr.sort((a,b) => (b.stock||0) - (a.stock||0));
    return arr;
  }

  window.cambiarOrden = function(valor) {
    ordenActual = valor;
    renderProductos();
  };

  function renderProductos(){
    const lista=ordenarProductos(productosFiltrados());
    const totalPaginas=Math.ceil(lista.length/PRODUCTOS_POR_PAGINA)||1;
    if(paginaActual>totalPaginas) paginaActual=totalPaginas;
    const inicio=(paginaActual-1)*PRODUCTOS_POR_PAGINA;
    const paginada=lista.slice(inicio,inicio+PRODUCTOS_POR_PAGINA);
    if(!lista.length){
      productsGrid.innerHTML='<p class="empty-products">No encontramos productos con ese filtro.</p>';
      return;
    }
    if(!paginada.length){
      productsGrid.innerHTML='<p class="empty-products">No hay más productos en esta página.</p>';
      return;
    }
    productsGrid.innerHTML=paginada.map((p)=>{
      const imagen=p.imagen?'<img src="'+p.imagen+'" alt="'+escapeHtml(p.nombre)+'" style="width:100%;height:100%;object-fit:cover;">':'<span class="emoji-product">'+emojiProducto(p.categoria)+'</span>';
      return (
        '<div class="product-card" style="cursor:pointer;" onclick="abrirDetalleProducto(\''+p.id+'\')">'+
        '<div class="card-img">'+imagen+
        '</div>'+
        '<div class="card-body">'+
        '<div class="card-cat">'+escapeHtml(p.categoria||'General')+(p.color?' · '+escapeHtml(p.color):'')+'</div>'+
        '<div class="card-name">'+escapeHtml(p.nombre)+'</div>'+
        stockBadge(p.stock)+
        '<div class="card-footer" style="margin-top:8px;">'+
        '<div class="card-price"><span class="price-main">'+formatPrecio(p.precio)+'</span>'+((p.tallas||'').trim()?'<span class="price-old" style="display:block;font-size:11px;color:#9b7b8a;text-decoration:none;">Talla: '+escapeHtml(p.tallas)+'</span>':'')+'</div>'+
        '<button class="add-cart-btn" title="Solicitar este producto" onclick="event.stopPropagation(); agregarAlCarrito(\''+p.id+'\')">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'+
        '</button>'+
        '</div></div></div>'
      );
    }).join('');
    // Asegurar que paginación esté siempre visible
    const wrap=document.querySelector('.pagination-wrap');
    if(wrap) wrap.style.display='flex';
  }
  async function cargarProductos(){
    try{
      const todos=await apiGet('productos.php');
      productos=todos.filter((p)=>Boolean(Number(p.disponible)));
      renderColorPills();
      renderProductos();
    }catch(err){ mostrarErrorConexion(err); }
  }

  window.filtrarPorCategoriaSelect = function(categoria) {
    categoriaActiva = categoria;
    renderProductos();
  };

  const CATEGORIAS_DEFAULT = ['Camisas', 'Pantalones', 'Chaquetas', 'Uniformes', 'Overoles', 'Ofertas', 'General'];

  function obtenerCategoriasTienda() {
    let cats = configTienda.categorias || [];
    if (typeof cats === 'string') {
      try { cats = JSON.parse(cats); } catch(e) { cats = []; }
    }
    if (!Array.isArray(cats)) cats = [];
    const todas = [...CATEGORIAS_DEFAULT];
    cats.forEach((cat) => {
      if (!todas.some((c) => c.toLowerCase() === cat.toLowerCase())) todas.push(cat);
    });
    return todas;
  }

  function poblarSelectCategorias() {
    const select = document.getElementById('selectCategoria');
    if (!select) return;
    const todas = obtenerCategoriasTienda();
    let html = '<option value="todos">Todas las categorías</option>';
    todas.forEach((cat) => {
      html += '<option value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</option>';
    });
    select.innerHTML = html;
  }

  // Actualizar renderProductos para usar categoriaActiva
  // ... (la lógica ya usa categoriaActiva global)

  // ---------- Filtro de colores (solo en detalle producto, NO en tienda) ----------
  // Ya no mostramos pills de color en la tienda principal.
  // Los colores se muestran dentro del panel de detalle del producto.
  function renderColorPills(){ // Sin-op: mantiene row hidden en tienda
    const row=document.getElementById('colorFilterRow');
    if(row) row.hidden=true;
  }
  window.filterColor=function(el,color){
    colorActiva=color;
    document.querySelectorAll('#colorPillsInner .cat-pill').forEach((btn)=>btn.classList.toggle('active',btn===el));
    renderProductos();
  };
  const searchInput=document.getElementById('searchInput');
  if(searchInput){ searchInput.addEventListener('input',function(){ terminoBusqueda=searchInput.value.trim().toLowerCase(); renderProductos();});}
  // ---------- PAGINACIÓN (siempre visible, organizado con 2,3,4...) ----------
  const PRODUCTOS_POR_PAGINA = 8;
  let paginaActual = 1;
  window.changePage=function(page){
    const total = productosFiltrados().length;
    const totalPaginas = Math.ceil(total / PRODUCTOS_POR_PAGINA) || 1;
    if(page==='first') paginaActual=1;
    else if(page==='last') paginaActual=totalPaginas;
    else paginaActual=page;
    if(paginaActual<1) paginaActual=1;
    if(paginaActual>totalPaginas) paginaActual=totalPaginas;
    renderProductos(); // ya llama a initPaginacion internamente
  };
  function initPaginacion(){
    const total=productosFiltrados().length;
    const totalPaginas=Math.ceil(total/PRODUCTOS_POR_PAGINA)||1;
    const wrap=document.querySelector('.pagination-wrap');
    if(!wrap) return;
    // Crear/actualizar botones según total de páginas
    let html='';
    if(totalPaginas>1){
      html+='<button class="page-btn nav" onclick="changePage(\'first\')">← Primera</button>';
      for(let i=1;i<=totalPaginas;i++){
        html+='<button class="page-btn num'+(i===1?' active':'')+'" onclick="changePage('+i+')">'+i+'</button>';
      }
      html+='<button class="page-btn nav" onclick="changePage(\'last\')">Última →</button>';
    } else {
      html+='<button class="page-btn nav" style="display:none;">← Primera</button>';
      html+='<button class="page-btn num active">1</button>';
      html+='<button class="page-btn nav" style="display:none;">Última →</button>';
    }
    wrap.innerHTML=html;
  }

  // ---------- Carrito ----------
  const cartOverlay=document.getElementById('cartOverlay');
  const cartPanel=document.getElementById('cartPanel');
  const cartBody=document.getElementById('cartBody');
  const cartFooter=document.getElementById('cartFooter');
  const cartCount=document.getElementById('cartCount');
  const cartTotal=document.getElementById('cartTotal');
  function persistCarrito(){ saveJSON(LS_CARRITO, carrito); }
  function actualizarBadge(){ const totalItems=carrito.reduce((sum,item)=>sum+item.cantidad,0); cartCount.textContent=totalItems; }
  function renderCarrito(){
    if(!carrito.length){
      cartBody.innerHTML='<div class="cart-empty"><div class="cart-empty-icon">🛒</div><h4>Tu carrito está vacío</h4><p>Selecciona productos y envía una solicitud al administrador.</p><button class="cart-empty-btn" onclick="closeCart()">Seguir comprando</button></div>';
      cartFooter.hidden=true; actualizarBadge(); return;
    }
    cartFooter.hidden=false;
    cartBody.innerHTML=carrito.map((item)=>{
      const imagen=item.imagen?'<img src="'+item.imagen+'" alt="'+escapeHtml(item.nombre)+'">':emojiProducto(item.categoria);
      return (
        '<div class="cart-item"><div class="cart-item-img">'+imagen+'</div><div class="cart-item-info"><div class="cart-item-name">'+escapeHtml(item.nombre)+(item.talla?' <small style="color:#9b7b8a;">· Talla '+escapeHtml(item.talla)+'</small>':'')+(item.color?' <small style="color:#9b7b8a;">· '+escapeHtml(item.color)+'</small>':'')+'</div><div class="cart-item-price">'+formatPrecio(item.precio)+'</div><div class="cart-item-qty"><button class="qty-btn" onclick="cambiarCantidad(\''+item.id+'\', -1)">−</button><span>'+item.cantidad+'</span><button class="qty-btn" onclick="cambiarCantidad(\''+item.id+'\', 1)">+</button><button class="cart-item-remove" onclick="quitarDelCarrito(\''+item.id+'\')">Quitar</button></div></div></div>'
      );
    }).join('');
    const total=carrito.reduce((sum,item)=>sum+item.precio*item.cantidad,0);
    cartTotal.textContent=formatPrecio(total); actualizarBadge();
  }
window.agregarAlCarrito=function(productoId){
    const producto=productos.find((p)=>String(p.id)===String(productoId)); if(!producto) return;
    if(!producto.disponible || Number(producto.disponible)===0){ showToast('😕 Producto no disponible por el momento'); return; }
    const tallasRaw=(producto.tallas||'').trim();
    const tallasList=tallasRaw ? tallasRaw.split(',').map(t=>t.trim()).filter(Boolean) : [];
    // Si tiene tallas y ninguna seleccionada: abrir detalle y mostrar alerta encima
    if(tallasList.length>0){
      productoDetalleActual=producto;
      detalleCantidad=1;
      tallaSeleccionada='';
      renderDetalleProducto();
      mostrarAlertaTallaDetalle('⚠️ Selecciona una talla antes de solicitar este producto.');
      if(productDetailOverlay) productDetailOverlay.classList.add('show');
      if(productDetailPanel) productDetailPanel.classList.add('show');
      return;
    }
    const existente=carrito.find((item)=>String(item.id)===String(producto.id) && item.talla===tallaSeleccionada);
    if(existente) existente.cantidad+=1;
    else carrito.push({id:producto.id,nombre:producto.nombre,precio:Number(producto.precio)||0,categoria:producto.categoria,color:producto.color||'',imagen:producto.imagen||'',talla:tallaSeleccionada,cantidad:1});
    persistCarrito(); renderCarrito();
    showToast('🛒 "'+producto.nombre+'" x1 añadido');
    openCart();
};

  window.cambiarCantidad=function(productoId,delta){
    const item=carrito.find((i)=>String(i.id)===String(productoId)); if(!item) return;
    item.cantidad+=delta;
    if(item.cantidad>99){ item.cantidad=99; showToast('Máximo 99 unidades por solicitud'); }
    if(item.cantidad<=0) carrito=carrito.filter((i)=>String(i.id)!==String(productoId));
    persistCarrito(); renderCarrito();
  };
  window.quitarDelCarrito=function(productoId){ carrito=carrito.filter((i)=>String(i.id)!==String(productoId)); persistCarrito(); renderCarrito(); showToast('Producto quitado'); };
  window.openCart=function(){ renderCarrito(); cartOverlay.classList.add('show'); cartPanel.classList.add('show'); };
  window.closeCart=function(){ cartOverlay.classList.remove('show'); cartPanel.classList.remove('show'); };

  // ---------- Detalle de Producto (panel lateral) ----------
  const productDetailOverlay=document.getElementById('productDetailOverlay');
  const productDetailPanel=document.getElementById('productDetailPanel');
  const productDetailBody=document.getElementById('productDetailBody');
  const detailProductName=document.getElementById('detailProductName');
  let productoDetalleActual=null;
  let detalleCantidad=1;
  let tallaSeleccionada='';

  function renderDetalleProducto(){
    const p=productoDetalleActual;
    if(!p) return;
    if(!productDetailBody) return; // safety: página sin panel de detalle
    if(detailProductName) detailProductName.textContent=escapeHtml(p.nombre);
    const imagen=p.imagen
      ? '<img src="'+p.imagen+'" alt="'+escapeHtml(p.nombre)+'">'
      : '<span class="emoji-large">'+emojiProducto(p.categoria)+'</span>';
    const tallasRaw=(p.tallas||'').trim();
    const tallasList=tallasRaw ? tallasRaw.split(',').map(t=>t.trim()).filter(Boolean) : [];
    const tallas = tallasRaw || 'No especificado';
    if(tallaSeleccionada && !tallasList.includes(tallaSeleccionada)) tallaSeleccionada='';
    const material=(p.material||'').trim() || 'No especificado';
    const descripcion=(p.descripcion||'').trim() || 'Sin descripción disponible.';
    const stockNum=Number(p.stock)||0;
    const stockTxt=stockNum<=0 ? 'Sobre pedido • Disponible' : (stockNum+' unidades disponibles');
    // No mostrar datos del taller en el detalle del producto (solo en mis solicitudes aprobadas y panel admin)
    productDetailBody.innerHTML=(
      '<div class="product-detail-content">'+
        '<div class="product-detail-img-col">'+
          '<div class="product-detail-img">'+imagen+'</div>'+
        '</div>'+
        '<div class="product-detail-info-col">'+
          '<div class="detail-info-row">'+
            '<span class="detail-label">Categoría</span>'+
            '<span class="detail-value">'+escapeHtml(p.categoria||'General')+'</span>'+
          '</div>'+
          (p.color?
          '<div class="detail-info-row">'+
            '<span class="detail-label">Color</span>'+
            '<span class="detail-value">'+escapeHtml(p.color)+'</span>'+
          '</div>':'')+
          '<div class="detail-info-row">'+
            '<span class="detail-label">Precio</span>'+
            '<span class="detail-value detail-price">'+formatPrecio(p.precio)+'</span>'+
          '</div>'+
          '<div class="detail-info-row">'+
            '<span class="detail-label">Talla(s)</span>'+
            '<span class="detail-value">'+escapeHtml(tallas)+'</span>'+
          '</div>'+
          '<div class="detail-info-row">'+
            '<span class="detail-label">Cantidad / Stock</span>'+
            '<span class="detail-value">'+stockTxt+'</span>'+
          '</div>'+
          '<div class="detail-info-row">'+
            '<span class="detail-label">Material</span>'+
            '<span class="detail-value">'+escapeHtml(material)+'</span>'+
          '</div>'+
          '<div class="detail-info-row">'+
            '<span class="detail-label">Descripción</span>'+
            '<span class="detail-value detail-desc">'+escapeHtml(descripcion)+'</span>'+
          '</div>'+
        '</div>'+
      '</div>'+
      (tallasList.length>0
        ? '<div class="detail-tallas-row" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">'+
            tallasList.map(t=>'<button type="button" class="talla-btn'+(tallaSeleccionada===t?' selected':'')+'" onclick="seleccionarTalla(\''+escapeHtml(t)+'\')" style="padding:8px 16px;border-radius:50px;border:1.5px solid rgba(240,86,122,0.3);background:'+(tallaSeleccionada===t?'#f0567a':'white')+';color:'+(tallaSeleccionada===t?'white':'#1a0a14')+';font-weight:600;font-size:13px;cursor:pointer;transition:all 0.2s;">'+escapeHtml(t)+'</button>').join('')+
          '</div>'
        : '')+
      '<div class="detail-actions">'+
        '<div class="detail-qty-row">'+
          '<span class="detail-qty-label">Cantidad a solicitar</span>'+
          '<div class="detail-qty-controls">'+
            '<button class="detail-qty-btn" onclick="cambiarCantidadDetalle(-1)" aria-label="Reducir cantidad">−</button>'+
            '<span class="detail-qty-num" id="detailQtyNum">'+detalleCantidad+'</span>'+
            '<button class="detail-qty-btn" onclick="cambiarCantidadDetalle(1)" aria-label="Aumentar cantidad">+</button>'+
          '</div>'+
        '</div>'+
        '<button class="btn-solicitar-producto" onclick="solicitarProductoDesdeDetalle()">'+
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>'+
          ' Solicitar producto'+
        '</button>'+
      '</div>'
    );
  }

  window.abrirDetalleProducto=function(productoId){
    const p=productos.find((pr)=>String(pr.id)===String(productoId));
    if(!p) return;
    productoDetalleActual=p;
    detalleCantidad=1;
    tallaSeleccionada='';
    renderDetalleProducto();
    if(productDetailOverlay) productDetailOverlay.classList.add('show');
    if(productDetailPanel) productDetailPanel.classList.add('show');
  };

  window.cerrarDetalleProducto=function(){
    if(productDetailOverlay) productDetailOverlay.classList.remove('show');
    if(productDetailPanel) productDetailPanel.classList.remove('show');
  };

  function mostrarAlertaTallaDetalle(texto){
    if(!productDetailBody) return;
    // quitar alerta previa si existe
    const previa=productDetailBody.querySelector('.alerta-talla-detalle');
    if(previa) previa.remove();
    const div=document.createElement('div');
    div.className='alerta-talla-detalle';
    div.style.cssText='background:#fff3cd;border:1px solid #ffeeba;color:#856404;padding:10px 14px;border-radius:10px;margin-bottom:12px;font-size:13px;font-weight:600;text-align:center;';
    div.textContent=texto;
    productDetailBody.prepend(div);
    productDetailBody.scrollTop=0;
  }

  window.seleccionarTalla=function(talla){
    tallaSeleccionada=talla;
    renderDetalleProducto();
  };

  window.cambiarCantidadDetalle=function(delta){
    detalleCantidad+=delta;
    if(detalleCantidad<1) detalleCantidad=1;
    if(detalleCantidad>99){ detalleCantidad=99; showToast('Máximo 99 unidades por solicitud'); }
    const el=document.getElementById('detailQtyNum');
    if(el) el.textContent=detalleCantidad;
  };

  window.solicitarProductoDesdeDetalle=function(){
    const p=productoDetalleActual;
    if(!p) return;
    if(!p.disponible || Number(p.disponible)===0){ showToast('😕 Producto no disponible por el momento'); return; }
    const tallasReq=(p.tallas||'').split(',').map(t=>t.trim()).filter(Boolean);
    if(tallasReq.length>0 && !tallaSeleccionada){
      mostrarAlertaTallaDetalle('⚠️ Selecciona una talla antes de solicitar este producto.');
      return;
    }
    const ses=loadJSON(LS_USER_SESSION,null);
    const existente=carrito.find((item)=>String(item.id)===String(p.id) && item.talla===tallaSeleccionada);
    if(existente) existente.cantidad+=detalleCantidad;
    else carrito.push({id:p.id,nombre:p.nombre,precio:Number(p.precio)||0,categoria:p.categoria,color:p.color||'',imagen:p.imagen||'',talla:tallaSeleccionada,cantidad:detalleCantidad});
    persistCarrito(); renderCarrito();
    showToast('🛒 "'+p.nombre+'" x'+detalleCantidad+' añadido');
    cerrarDetalleProducto();
    // Si no está registrado, lo lleva al login (estilo Mercado Libre) antes de pedir
    if(!ses){ abrirLoginChoice(); return; }
    openCart();
  };

  // ---------- Solicitud / Checkout ----------
  const checkoutModal=document.getElementById('checkoutModal');
  const checkoutForm=document.getElementById('checkoutForm');

  function prefillCheckout(){
    const ses=loadJSON(LS_USER_SESSION,null);
    if(!ses) return;
    if(ses.nombre) document.getElementById('checkoutNombre').value=(ses.nombre||'').split(' ')[0]||ses.nombre||'';
    if(ses.apellido) document.getElementById('checkoutApellido').value=ses.apellido||'';
    const tel = ses.telefono || ses.whatsapp || '';
    if(tel) document.getElementById('checkoutTelefono').value=tel;
    // intenta traer direccion/ciudad si estuvieran guardadas
    if(ses.ciudad) document.getElementById('checkoutCiudad').value=ses.ciudad;
    if(ses.departamento) document.getElementById('checkoutDepartamento').value=ses.departamento;
  }

  window.abrirLoginChoice=function(){ const m=document.getElementById('loginChoiceModal'); if(m) m.hidden=false; };
  window.cerrarLoginChoice=function(){ const m=document.getElementById('loginChoiceModal'); if(m) m.hidden=true; };
  window.continuarLoginChoice=function(){
    const email=(document.getElementById('loginChoiceEmail')||{}).value||'';
    if(!email.trim()){ showToast('Ingresa tu e-mail o teléfono'); return; }
    // Guarda email para pre-llenar login y redirige a login con estilo ML
    try{ localStorage.setItem('cym_login_prefill', email.trim()); }catch(e){}
    saveJSON('cym_redirect_after_login', {to:'tienda', carrito: carrito, email: email.trim()});
    window.location.href = LOGIN_PAGE + '?prefill=' + encodeURIComponent(email.trim());
  };
  function estaAbiertoPorHorario() {
    try{
      const now=new Date();
      const dia=now.getDay();
      if(dia===0) return false;
      const hh=String(now.getHours()).padStart(2,'0');
      const mm=String(now.getMinutes()).padStart(2,'0');
      const horaActual=hh+':'+mm;
      const ap=configTienda.horarioApertura||'08:00';
      const ci=configTienda.horarioCierre||'18:00';
      return horaActual>=ap && horaActual<=ci;
    }catch(e){ return true; }
  }

  window.abrirCheckout=function(){ // Si no está registrado va directo al login usuario
    if(!carrito.length) return;
    const sesChk = loadJSON(LS_USER_SESSION,null);
    if(!sesChk){
      saveJSON('cym_redirect_after_login', {to:'tienda', carrito: carrito});
      window.location.href = 'costuras_y_modas.html#usuario';
      return;
    }
    if(!estaAbiertoPorHorario()){
      const ap=configTienda.horarioApertura||'08:00';
      const ci=configTienda.horarioCierre||'18:00';
      const dias=configTienda.horarioDias||'';
      showToast('⏰ Cerrado ahora · Horario '+(dias?dias+' ':'')+ap+' - '+ci);
      if(!confirm('La tienda está cerrada ahora ('+ap+' - '+ci+'). ¿Deseas enviar la solicitud igual y te respondemos cuando abramos?')) return;
    }
    closeCart();
    prefillCheckout();
    // asegura que info taller y pago estén actualizados
    actualizarPagoHelp();
    checkoutModal.hidden=false;
  };
  // Terminos en tienda
  window.abrirTerminosTienda = function(){
    const ov = document.getElementById('terminosOverlayTienda');
    const txt = document.getElementById('terminosTextoTienda');
    if(txt) txt.textContent = configTienda.terminos || 'Términos: Solo 2 métodos — 1) Cliente paga y va al local (retiro en taller), 2) Contraentrega por Nequi con anticipo 40.000 COP. Si no estás a la hora acordada sin avisar, se retiene el anticipo. Tiempo espera 1-2 semanas.';
    if(ov) ov.hidden=false;
  };
  window.cerrarTerminosTienda = function(){ const ov=document.getElementById('terminosOverlayTienda'); if(ov) ov.hidden=true; };
  const openTerminosCheckout = document.getElementById('openTerminosCheckout');
  if(openTerminosCheckout) openTerminosCheckout.addEventListener('click', function(e){ e.preventDefault(); window.abrirTerminosTienda(); });
  const selPago = document.getElementById('checkoutMetodoPago');
  if(selPago) selPago.addEventListener('change', actualizarPagoHelp);
  window.cerrarCheckout=function(){ checkoutModal.hidden=true; };
  checkoutModal.addEventListener('click',function(e){ if(e.target===checkoutModal) cerrarCheckout(); });

  checkoutForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const btn = checkoutForm.querySelector('button[type="submit"]');
    const total=carrito.reduce((sum,item)=>sum+item.precio*item.cantidad,0);
    const ses=loadJSON(LS_USER_SESSION,null);
    if(!ses){ showToast('Debes iniciar sesión'); window.location.href=LOGIN_PAGE; return; }
    const terminosOk = document.getElementById('checkoutTerminos');
    if(terminosOk && !terminosOk.checked){ showToast('Debes aceptar Términos y Condiciones'); return; }
    const metodoPago = (document.getElementById('checkoutMetodoPago')||{}).value || 'contraentrega';

    const pedido={
      usuario_id: ses?ses.id:null,
      nombre: document.getElementById('checkoutNombre').value.trim(),
      apellido: document.getElementById('checkoutApellido').value.trim(),
      telefono: document.getElementById('checkoutTelefono').value.trim(),
      whatsapp: document.getElementById('checkoutTelefono').value.trim(),
      direccion: document.getElementById('checkoutDireccion').value.trim(),
      ciudad: document.getElementById('checkoutCiudad').value.trim(),
      departamento: document.getElementById('checkoutDepartamento').value.trim(),
      metodo_pago: metodoPago,
      metodoPago: metodoPago,
      total: total,
      terminos: terminosOk ? terminosOk.checked : true,
      items: carrito.map((i)=>({productoId:i.id,nombre:i.nombre,cantidad:i.cantidad,precio:i.precio})),
    };

    if(metodoPago==='recoger_taller'){
      const nombreRecoge=document.getElementById('checkoutNombreRecoge').value.trim();
      const telefonoRecoge=document.getElementById('checkoutTelefonoRecoge').value.trim();
      const fechaRecoge=document.getElementById('checkoutFechaRecoge').value;
      if(!nombreRecoge||!telefonoRecoge||!fechaRecoge){
        showToast('⚠️ Completa quién va a recoger, su número y la fecha estimada');
        return;
      }
      const hoy=new Date(); hoy.setHours(0,0,0,0);
      const selFecha=new Date(fechaRecoge); selFecha.setHours(0,0,0,0);
      const diffDays=Math.round((selFecha-hoy)/(1000*60*60*24));
      if(diffDays<0||diffDays>10){
        showToast('⚠️ La fecha estimada debe ser entre hoy y dentro de 10 días máximo');
        return;
      }
      pedido.nombreRecoge=nombreRecoge;
      pedido.telefonoRecoge=telefonoRecoge;
      pedido.fechaRecoge=fechaRecoge;
    } else {
      if(!pedido.nombre||!pedido.apellido||!pedido.telefono||!pedido.direccion||!pedido.ciudad||!pedido.departamento){
        showToast('⚠️ Completa todos los campos: nombre, teléfono, dirección, ciudad y departamento');
        return;
      }
    }
    if(!carrito.length){ showToast('Carrito vacío'); return; }
    const prevText = btn ? btn.textContent : '';
    if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }
    try{
      const r = await apiSend('pedidos.php','POST',pedido);
      carrito=[]; persistCarrito(); actualizarBadge();
      checkoutForm.reset(); cerrarCheckout();
      let msg='✅ Solicitud #'+(r.id||'')+' enviada. Espera el código del admin.';
      if(r.metodo_pago==='contraentrega') msg+=' Anticipo '+formatPrecio(r.anticipo||40000)+' por Contraentrega por Nequi';
      if(r.metodo_pago==='taller_fisico') msg+=' Pago en local: ve a '+(configTienda.direccionTaller||'taller');
      if(r.expira) msg+=' Expira: '+formatFecha(r.expira);
      showToast(msg);
      setTimeout(()=> abrirSolicitudes(), 900);
    }catch(err){
      console.error('POST pedidos.php error:', err);
      mostrarErrorConexion(err);
    }finally{
      if(btn){ btn.disabled=false; btn.textContent=prevText || 'Enviar solicitud'; }
    }
  });

  // ---------- Perfil ----------
  const perfilModal=document.getElementById('perfilModal');
  const perfilBody=document.getElementById('perfilBody');
  function renderPerfil(){
    const sesion=loadJSON(LS_USER_SESSION,null);
    if(!sesion){
      perfilBody.innerHTML='<div class="perfil-invitado"><div class="perfil-invitado-icon">👤</div><p class="perfil-nombre">No has iniciado sesión</p><p>Inicia sesión para que tus solicitudes queden vinculadas a tu cuenta.</p><button class="cart-empty-btn" onclick="irALogin()">Iniciar sesión</button></div>';
      return;
    }
    perfilBody.innerHTML='<div class="perfil-avatar">👤</div><div class="perfil-nombre">'+escapeHtml(sesion.nombre||'Usuario')+'</div><div class="perfil-email">'+escapeHtml(sesion.email||'')+'</div><div class="perfil-detalle"><div class="perfil-detalle-row"><span>Correo</span><span>'+escapeHtml(sesion.email||'')+'</span></div><div class="perfil-detalle-row"><span>ID</span><span>'+escapeHtml(String(sesion.id||''))+'</span></div></div><div class="modal-actions"><button type="button" class="btn-secondary-modal" onclick="cerrarSesionUsuario()">Cerrar sesión</button><button type="button" class="btn-primary-modal" onclick="cerrarPerfil()">Seguir comprando</button></div>';
  }
  window.abrirPerfil=function(){ renderPerfil(); perfilModal.hidden=false; };
  window.cerrarPerfil=function(){ perfilModal.hidden=true; };
  window.irALogin=function(){ window.location.href=LOGIN_PAGE + '#usuario'; }; // va directo a login usuario, sin selector
  window.cerrarSesionUsuario=function(){ // Cierra sesión y redirige al login (costuras_y_modas.html) — FIX inmediato sin timeout bloqueado
    // Siempre redirige, haya o no sesión, y lo hace en el mismo gesto del click
    const ses = loadJSON(LS_USER_SESSION,null);
    if(!ses){
      localStorage.removeItem(LS_USER_SESSION);
      window.location.href = LOGIN_PAGE; // va directo aunque no haya sesión
      return;
    }
    if(!confirm('¿Cerrar tu sesión?')) return;
    localStorage.removeItem(LS_USER_SESSION);
    // Redirección inmediata (no en setTimeout para que el navegador no lo bloquee)
    window.location.href = LOGIN_PAGE;
  };

  // ---------- Menú (3 rayas) ----------
  const menuOverlay=document.getElementById('menuOverlay');
  const menuPanel=document.getElementById('menuPanel');
  window.abrirMenu=function(){ menuOverlay.classList.add('show'); menuPanel.classList.add('show'); }; // Abre panel lateral del menú
  window.cerrarMenu=function(){ menuOverlay.classList.remove('show'); menuPanel.classList.remove('show'); }; // Cierra panel del menú
  // Botón Cerrar sesión del menú (3 rayas) — FIX: listener robusto + delegación
  const btnCerrarSesionMenu = document.getElementById('btnCerrarSesionMenu');
  if(btnCerrarSesionMenu){
    // Listener directo
    btnCerrarSesionMenu.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      console.log('btnCerrarSesionMenu click'); // para depurar en consola
      window.cerrarSesionUsuario();
    });
    // También asegura que el onclick inline funcione por si el listener no se enganchó
    btnCerrarSesionMenu.onclick = function(e){ e.preventDefault(); window.cerrarSesionUsuario(); };
  } else {
    console.warn('btnCerrarSesionMenu no encontrado');
  }
  // Delegación global por si el DOM se recrea
  document.addEventListener('click', function(e){
    const t = e.target.closest && e.target.closest('#btnCerrarSesionMenu');
    if(t){ e.preventDefault(); window.cerrarSesionUsuario(); }
  });

  // ---------- Mis Solicitudes (botón en 3 rayas) ----------
  const solicitudesModal=document.getElementById('solicitudesModal');
  const solicitudesBody=document.getElementById('solicitudesBody');
  window.abrirSolicitudes=async function(){
    cerrarMenu();
    solicitudesModal.hidden=false;
    solicitudesBody.innerHTML='<p style="text-align:center;color:#9b7b8a;">Cargando...</p>';
    await cargarMisSolicitudes();
  };
  window.cerrarSolicitudes=function(){ solicitudesModal.hidden=true; };
  document.getElementById('btnMisSolicitudes').addEventListener('click', abrirSolicitudes);
  // cerrar si click fuera
  // solicitudesModal ya tiene onclick en html

  window.cancelarSolicitud = async function(id){
    if(!confirm('¿Cancelar esta solicitud? Se liberará el stock.')) return;
    try{ await apiSend('pedidos.php?id='+id,'PATCH',{accion:'cancelar'}); showToast('Solicitud cancelada'); await cargarMisSolicitudes(); }catch(e){ mostrarErrorConexion(e); }
  };
  async function cargarMisSolicitudes(){
    const ses=loadJSON(LS_USER_SESSION,null);
    let url='pedidos.php';
    if(ses && ses.id) url='pedidos.php?usuario_id='+encodeURIComponent(ses.id);
    else {
      solicitudesBody.innerHTML='<div style="text-align:center;padding:20px;"><p style="color:#9b7b8a;font-size:13px;margin-bottom:12px;">Inicia sesión para ver tus solicitudes vinculadas.<br>Si ya enviaste una como invitado, el admin te contactará por WhatsApp.</p><button class="cart-empty-btn" onclick="irALogin()">Iniciar sesión</button></div>';
      return;
    }
    try{
      const lista=await apiGet(url);
      if(!lista.length){
        solicitudesBody.innerHTML='<div style="text-align:center;padding:20px;color:#9b7b8a;"><p>No tienes solicitudes aún.</p><p style="font-size:12px;">Agrega productos al carrito y envía tu primera solicitud.</p></div>';
        return;
      }
      // Resumen del cliente (como pide: nombre, telefono, correo, direccion, cuantos pedidos, total)
      const totalValor = lista.reduce((s,p)=> s + (parseFloat(p.total)||0), 0);
      const resumen = '<div style="background:linear-gradient(135deg,#fce4ec,#f3e5f5);border-radius:12px;padding:12px;margin-bottom:14px;">'
        +'<strong style="color:#7B2D5E;">👤 '+escapeHtml(ses.nombre||'')+' '+escapeHtml(ses.apellido||'')+'</strong><br>'
        +'<small style="color:#7A7079;">📧 '+escapeHtml(ses.email||'')+' • 📱 '+escapeHtml(ses.telefono||ses.whatsapp||'')+'<br>📍 '+(ses.ciudad?escapeHtml(ses.ciudad):'')+' • Pedidos: '+lista.length+' • Total acumulado: '+formatPrecio(totalValor)+'</small>'
        +'</div>';
      const adminWa=(configTienda.whatsapp||'').replace(/[^0-9]/g,'');
      const itemsHtml = (items)=> {
        if(!items || !items.length) return '<small style="color:#9b7b8a;">Sin detalle</small>';
        return '<div style="margin:6px 0;">'+items.map(it=> '<div style="display:flex;justify-content:space-between;font-size:12px;border-bottom:1px dashed #fce4ec;padding:4px 0;">'
          +'<span>'+escapeHtml(it.producto_nombre||it.nombre||'Producto')+' x'+it.cantidad+'</span><span>'+formatPrecio(it.precio_unitario*it.cantidad)+'</span></div>').join('')+'</div>';
      };
      solicitudesBody.innerHTML = resumen + lista.map((p)=>{
        const estado=(p.estado||'Pendiente').trim();
        const low=estado.toLowerCase();
        const aceptada=low.startsWith('aceptada')||low==='confirmado';
        const rechazada=low.startsWith('rechazada');
        const expirado=low==='expirado' || low==='expirada';
        const pendiente=low==='pendiente';
        const cancelado=low==='cancelado';
        let badgeColor='#f0567a';
        let estadoTexto=estado;
        if(aceptada){ badgeColor='#10b981'; estadoTexto='🟢 APROBADO — LISTO PARA RECOGER'; }
        if(rechazada){ badgeColor='#ef4444'; estadoTexto='🔴 RECHAZADA'; }
        if(expirado){ badgeColor='#6b7280'; estadoTexto='⌛ EXPIRADA'; }
        if(cancelado){ badgeColor='#9ca3af'; estadoTexto='🚫 CANCELADA'; }
        if(pendiente){ badgeColor='#f59e0b'; estadoTexto='🟡 PENDIENTE'; }
        const metodo = p.metodo_pago||'contraentrega';
        const items = p.items || [];
        const tallaTexto = items.length? items.map(it=>it.talla||'').filter(Boolean).join(', ') : '';
        const nombreProd = items.length? items.map(it=>it.nombre||'Producto').join(', ') : 'Producto';
        const fechaSolicitud = p.fecha? new Date(p.fecha).toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'}) : '';
        const fechaEntrega = p.fechaRecoge? new Date(p.fechaRecoge).toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'}) : '';
        const horaEntrega = p.fechaRecoge? ' — 3:00 PM' : '';
        const waRaw=(configTienda.whatsapp||'').replace(/\D/g,'');
        const waLink=waRaw? 'https://wa.me/'+waRaw : '';
        const waDisplay = waRaw ? (waRaw.length>=10 ? waRaw.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1 $2 $3') : waRaw) : '—';
        const tallerNombre = configTienda.nombreEmpresa||'Karen Confección & Moda';
        const tallerDir = configTienda.direccionTaller||'Calle 10 # 15-20, Barrio Centro';
        const tallerFoto = configTienda.fotoTaller||'';
        const esRecogerTaller = String(p.metodo_pago||'').trim().toLowerCase()==='recoger_taller';
        return (
          '<div style="border:1.5px solid #fce4ec;border-radius:14px;padding:14px;margin-bottom:12px;">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
              '<strong>Solicitud #'+p.id+' — '+(tallaTexto? 'Talla '+tallaTexto+' ('+escapeHtml(nombreProd)+')' : escapeHtml(nombreProd))+'</strong>'+
              '<span style="background:'+badgeColor+';color:white;font-size:11px;padding:3px 8px;border-radius:20px;">'+estadoTexto+'</span>'+
            '</div>'+
            '<div style="font-size:12px;color:#7A7079;margin-bottom:4px;">Fecha de solicitud: '+fechaSolicitud+'</div>'+
            (fechaEntrega?'<div style="font-size:12px;color:#7A7079;margin-bottom:4px;">Fecha acordada de entrega: '+fechaEntrega+horaEntrega+'</div>':'')+
            (esRecogerTaller
              ? '<div style="background:'+(aceptada?'#f0f9ff':'#fef3e2')+';border:1.5px solid '+(aceptada?'#bae6fd':'#fcd34d')+';border-radius:12px;padding:12px;margin:8px 0;">'+
                  '<div style="font-size:13px;color:'+(aceptada?'#0369a1':'#b45309')+';font-weight:700;margin-bottom:6px;">📍 '+(aceptada?'Datos de Recogida en Taller':'Punto de Recogida en Taller')+'</div>'+
                  '<div style="font-size:12px;color:#1a0a14;"><strong>Dirección:</strong> '+escapeHtml(tallerDir)+' ('+escapeHtml(tallerNombre)+')</div>'+
                  (waLink?'<div style="font-size:12px;color:#1a0a14;"><strong>Contacto:</strong> 📲 Escribir por WhatsApp ('+waDisplay+')</div>':'')+
                  (tallerFoto?'<div style="margin-top:8px;"><strong>Ubicación / Foto del Taller:</strong><br><img src="'+tallerFoto+'" style="width:100%;max-width:260px;border-radius:10px;border:1px solid '+(aceptada?'#bae6fd':'#fcd34d')+';"></div>':'')+
                  (aceptada?'<div style="margin-top:6px;font-size:11px;color:#047857;font-weight:600;">✅ Lista para recoger en el taller</div>':'<div style="margin-top:6px;font-size:11px;color:#b45309;">⏳ Pendiente de aprobación del admin</div>')+
                '</div>' : '')+
            '<div style="font-size:12px;color:#9b7b8a;margin-top:8px;">Total: <strong style="color:#1a0a14;">'+formatPrecio(p.total)+'</strong></div>'+
            (pendiente ? '<div style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:8px;border-radius:8px;margin-top:8px;">⏳ En espera — el admin debe aceptar.</div>' : '')+
            (expirado ? '<div style="font-size:12px;color:#444;background:#f3f4f6;border:1px solid #d1d5db;padding:8px;border-radius:8px;margin-top:8px;">⌛ Expirada — pasó el tiempo de espera y se liberó.</div>' : '')+
            (rechazada ? '<div style="font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;padding:8px;border-radius:8px;margin-top:8px;">❌ Rechazada</div>' : '')+
            (cancelado ? '<div style="font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;padding:8px;border-radius:8px;margin-top:8px;">🚫 Cancelada por ti</div>' : '')+
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">'+
              (pendiente ? '<button onclick="cancelarSolicitud(\''+p.id+'\')" style="background:white;border:1.5px solid #fda4af;color:#be123c;padding:6px 10px;border-radius:20px;font-size:11px;cursor:pointer;">Cancelar esta</button>' : '')+
              (aceptada && waLink ? '<a href="'+waLink+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:white;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;text-decoration:none;">💬 WhatsApp admin</a>' : '')+
            '</div>'+
          '</div>'
        );
      }).join('');
      // Botón cancelar todas pendientes
      const pendientes = lista.filter(p=> (p.estado||'').toLowerCase()==='pendiente');
      if(pendientes.length>1){
        solicitudesBody.innerHTML += '<div style="text-align:center;margin-top:10px;"><button onclick="if(confirm(\'¿Cancelar todas tus pendientes? ('+pendientes.length+')\')){ Promise.all(['+pendientes.map(p=>"apiSend(\'pedidos.php?id="+p.id+"\',\'PATCH\',{accion:\'cancelar\'})").join(',')+']).then(()=>cargarMisSolicitudes()); }" style="background:#fff;border:1px solid #e5e7eb;color:#6b7280;padding:8px 14px;border-radius:20px;font-size:12px;cursor:pointer;">Cancelar todas ('+pendientes.length+')</button></div>';
      }
    }catch(err){
      solicitudesBody.innerHTML='<p style="color:#ef4444;text-align:center;">Error cargando solicitudes: '+(err.message||'')+'</p>';
    }
  }

  // ---------- Init ----------
  cargarConfigTienda().then(() => {
    poblarSelectCategorias();
  });
  cargarProductos();
  poblarSelectCategorias();
  actualizarBadge();
  // Paginación siempre organizada con primera,1,2,3,última
  setTimeout(function(){ paginaActual=1; initPaginacion(); }, 200);

})();
