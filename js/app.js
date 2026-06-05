let peliculas = [];
let carrito = JSON.parse(localStorage.getItem('mcu_cart')) || [];
let filtroFase = 'all';
let busquedaQuery = '';
let ordenSeleccionado = 'chrono';
let cuponAplicado = null;

const cuponesValidos = {
    'MARVEL20': 0.20,
    'AVENGERS10': 0.10,
    'ENDGAME15': 0.15
};

const catalogGrid = document.getElementById('catalog-grid');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.btn-filter');
const sortSelect = document.getElementById('sort-select');

const cartBadge = document.getElementById('cart-badge');
const cartEmptyMessage = document.getElementById('cart-empty-message');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartList = document.getElementById('cart-list');

const couponInput = document.getElementById('coupon-input');
const applyCouponBtn = document.getElementById('apply-coupon-btn');
const couponMessage = document.getElementById('coupon-message');

const cartSubtotal = document.getElementById('cart-subtotal');
const rowDiscount = document.getElementById('row-discount');
const cartDiscountValue = document.getElementById('cart-discount-value');
const cartTotal = document.getElementById('cart-total');

const clearCartBtn = document.getElementById('clear-cart-btn');
const checkoutBtn = document.getElementById('checkout-btn');

const statCount = document.getElementById('stat-count');
const statDigital = document.getElementById('stat-digital');
const statBluray = document.getElementById('stat-bluray');
const statDiscount = document.getElementById('stat-discount');
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

async function inicializarApp() {
    await cargarPeliculas();
    configurarEventos();
    actualizarInterfaz();
}

async function cargarPeliculas() {
    try {
        const respuesta = await fetch('js/data/peliculas.json');
        if (!respuesta.ok) {
            throw new Error('No se pudo establecer la conexión con la base de datos de Marvel.');
        }
        peliculas = await respuesta.json();
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'Ha ocurrido un error al cargar el catálogo de películas: ' + error.message,
            customClass: {
                popup: 'marvel-swal-theme',
                title: 'marvel-swal-theme',
                htmlContainer: 'marvel-swal-theme',
                confirmButton: 'marvel-swal-btn'
            }
        });
        catalogGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Error al cargar el multiverso. Por favor, recarga la página.
            </div>
        `;
    }
}

function configurarEventos() {
    searchInput.addEventListener('input', (e) => {
        busquedaQuery = e.target.value.toLowerCase().trim();
        renderizarCatalogo();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filtroFase = e.target.getAttribute('data-phase');
            renderizarCatalogo();
        });
    });

    sortSelect.addEventListener('change', (e) => {
        ordenSeleccionado = e.target.value;
        renderizarCatalogo();
    });

    catalogGrid.addEventListener('click', (e) => {
        const btnAdd = e.target.closest('.btn-add-cart');
        if (btnAdd) {
            const peliculaId = parseInt(btnAdd.getAttribute('data-id'));
            const tarjeta = btnAdd.closest('.movie-card');
            const formatoSeleccionado = tarjeta.querySelector(`input[name="format_${peliculaId}"]:checked`).value;
            agregarAlCarrito(peliculaId, formatoSeleccionado);
            return;
        }

        const btnDetails = e.target.closest('.btn-details-icon');
        if (btnDetails) {
            const peliculaId = parseInt(btnDetails.getAttribute('data-id'));
            mostrarDetallesPelicula(peliculaId);
        }
    });


    applyCouponBtn.addEventListener('click', () => {
        const codigo = couponInput.value.toUpperCase().trim();
        procesarCupon(codigo);
    });

    clearCartBtn.addEventListener('click', () => {
        vaciarCarritoConConfirmacion();
    });

    checkoutBtn.addEventListener('click', () => {
        iniciarSimulacionCheckout();
    });
}

function obtenerPeliculasFiltradasYOrdenadas() {
    let resultado = peliculas.filter(peli => {
        const coincideBusqueda = peli.titulo.toLowerCase().includes(busquedaQuery);
        const coincideFase = filtroFase === 'all' || peli.fase === parseInt(filtroFase);
        return coincideBusqueda && coincideFase;
    });
    resultado.sort((a, b) => {
        if (ordenSeleccionado === 'chrono') {
            return a.ordenCronologico - b.ordenCronologico;
        } else if (ordenSeleccionado === 'release-asc') {
            return a.estreno - b.estreno;
        } else if (ordenSeleccionado === 'release-desc') {
            return b.estreno - a.estreno;
        } else if (ordenSeleccionado === 'price-digital-asc') {
            return a.precioDigital - b.precioDigital;
        } else if (ordenSeleccionado === 'price-bluray-asc') {
            return a.precioBluRay - b.precioBluRay;
        }
        return 0;
    });

    return resultado;
}

function renderizarCatalogo() {
    const listado = obtenerPeliculasFiltradasYOrdenadas();
    catalogGrid.innerHTML = '';

    if (listado.length === 0) {
        catalogGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-ban"></i>
                No se encontraron películas que coincidan con los filtros aplicados.
            </div>
        `;
        return;
    }

    listado.forEach(peli => {
        const card = document.createElement('article');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="movie-cover-wrapper">
                <span class="movie-badge-chrono">Orden: #${peli.ordenCronologico}</span>
                <span class="movie-badge-phase">Fase ${peli.fase}</span>
                <img src="${peli.imagen}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'fallback-cover\'><div class=\'fallback-logo\'>MARVEL</div><div class=\'fallback-title\'>${peli.titulo}</div><i class=\'fa-solid fa-film fallback-icon\'></i></div>'" class="movie-img" alt="${peli.titulo}">
            </div>
            <div class="movie-info">
                <span class="movie-year">${peli.estreno} • Dir: ${peli.director}</span>
                <h3 class="movie-card-title">${peli.titulo}</h3>
                
                <div class="formats-box">
                    <span class="formats-title">Selecciona Formato:</span>
                    <div class="format-options">
                        <label class="format-option">
                            <input type="radio" name="format_${peli.id}" value="digital" checked>
                            <span class="format-card">
                                <span class="format-name"><i class="fa-solid fa-cloud-arrow-down"></i> Digital</span>
                                <span class="format-price">$${peli.precioDigital.toFixed(2)}</span>
                            </span>
                        </label>
                        <label class="format-option">
                            <input type="radio" name="format_${peli.id}" value="bluray">
                            <span class="format-card">
                                <span class="format-name"><i class="fa-solid fa-compact-disc"></i> Blu-Ray</span>
                                <span class="format-price">$${peli.precioBluRay.toFixed(2)}</span>
                            </span>
                        </label>
                    </div>
                </div>
                
                <div class="movie-actions">
                    <button class="btn-details-icon" data-id="${peli.id}" title="Ver Sinopsis y Detalles">
                        <i class="fa-solid fa-circle-info"></i>
                    </button>
                    <button class="btn btn-primary btn-add-cart" data-id="${peli.id}">
                        <i class="fa-solid fa-cart-plus"></i> Comprar
                    </button>
                </div>
            </div>
        `;
        catalogGrid.appendChild(card);
    });
}

/**
 * Agrega un elemento al carrito de compras
 * @param {number} peliculaId 
 * @param {string} formato 
 */

function agregarAlCarrito(peliculaId, formato) {
    const pelicula = peliculas.find(p => p.id === peliculaId);
    if (!pelicula) return;

    const precio = formato === 'digital' ? pelicula.precioDigital : pelicula.precioBluRay;
    const cartItemId = `${peliculaId}_${formato}`;

    const itemExistente = carrito.find(item => item.id === cartItemId);

    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
            id: cartItemId,
            peliculaId: peliculaId,
            titulo: pelicula.titulo,
            formato: formato,
            precio: precio,
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarInterfaz();

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Añadido al Carrito',
        text: `"${pelicula.titulo}" (${formato === 'digital' ? 'Digital' : 'Blu-Ray'})`,
        showConfirmButton: false,
        timer: 2000,
        background: '#16161b',
        color: '#ffffff',
        iconColor: '#ECB939',
        customClass: {
            popup: 'marvel-swal-theme'
        }
    });
}

/**
 * Remueve un elemento específico del carrito
 * @param {string} cartItemId
 */
function removerDelCarrito(cartItemId) {
    carrito = carrito.filter(item => item.id !== cartItemId);
    guardarCarrito();
    actualizarInterfaz();
}

/**
 * Limpia todos los elementos del carrito
 */
function vaciarCarrito() {
    carrito = [];
    cuponAplicado = null;
    couponInput.value = '';
    couponMessage.textContent = '';
    guardarCarrito();
    actualizarInterfaz();
}


function vaciarCarritoConConfirmacion() {
    Swal.fire({
        title: '¿Vaciar Carrito?',
        text: 'Se eliminarán todos los artículos seleccionados del carrito de compras.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'marvel-swal-theme',
            title: 'marvel-swal-theme',
            htmlContainer: 'marvel-swal-theme',
            confirmButton: 'marvel-swal-btn',
            cancelButton: 'marvel-swal-btn-secondary'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            vaciarCarrito();
            Swal.fire({
                title: 'Carrito Vaciado',
                text: 'El carrito de compras ha sido limpiado correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: 'marvel-swal-theme',
                    title: 'marvel-swal-theme',
                    htmlContainer: 'marvel-swal-theme'
                }
            });
        }
    });
}

/**
 * Guarda el carrito actual en el almacenamiento local del navegador
 */
function guardarCarrito() {
    localStorage.setItem('mcu_cart', JSON.stringify(carrito));
}

/**
 * Procesa y valida el cupón ingresado por el usuario
 * @param {string} codigo 
 */
function procesarCupon(codigo) {
    if (!codigo) {
        couponMessage.textContent = 'Por favor ingresa un código de descuento.';
        couponMessage.className = 'coupon-message error';
        return;
    }

    if (carrito.length === 0) {
        couponMessage.textContent = 'El carrito está vacío. Añade películas primero.';
        couponMessage.className = 'coupon-message error';
        return;
    }

    if (codigo in cuponesValidos) {
        cuponAplicado = codigo;
        couponMessage.textContent = `¡Cupón ${codigo} aplicado! Descuento del ${(cuponesValidos[codigo] * 100)}% activado.`;
        couponMessage.className = 'coupon-message success';
        actualizarInterfaz();
    } else {
        couponMessage.textContent = 'Cupón no válido o expirado.';
        couponMessage.className = 'coupon-message error';
    }
}


function renderizarCarrito() {
    if (carrito.length === 0) {
        cartEmptyMessage.classList.remove('hidden');
        cartItemsContainer.classList.add('hidden');
        cartBadge.textContent = '0';
        return;
    }

    cartEmptyMessage.classList.add('hidden');
    cartItemsContainer.classList.remove('hidden');

    cartList.innerHTML = '';

    carrito.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-title">${item.titulo}</span>
                <div class="cart-item-meta">
                    <span class="badge-format">${item.formato === 'digital' ? 'Digital' : 'Blu-Ray'}</span>
                    <span>Cant: ${item.cantidad}</span>
                </div>
            </div>
            <span class="cart-item-price">$${(item.precio * item.cantidad).toFixed(2)}</span>
            <button class="btn-remove-item" data-id="${item.id}" title="Eliminar del carrito">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        li.querySelector('.btn-remove-item').addEventListener('click', (e) => {
            const itemId = e.currentTarget.getAttribute('data-id');
            removerDelCarrito(itemId);
        });

        cartList.appendChild(li);
    });

    const subtotal = carrito.reduce((acumulador, item) => acumulador + (item.precio * item.cantidad), 0);
    let descuento = 0;

    if (cuponAplicado && cuponAplicado in cuponesValidos) {
        descuento = subtotal * cuponesValidos[cuponAplicado];
        rowDiscount.classList.remove('hidden');
        cartDiscountValue.textContent = `-$${descuento.toFixed(2)}`;
    } else {
        rowDiscount.classList.add('hidden');
    }

    const totalFinal = subtotal - descuento;

    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartTotal.textContent = `$${totalFinal.toFixed(2)}`;
    cartBadge.textContent = carrito.reduce((acc, item) => acc + item.cantidad, 0).toString();
}


function actualizarStats() {
    const totalPeliculas = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    statCount.textContent = totalPeliculas;

    const digitalCount = carrito.filter(item => item.formato === 'digital').reduce((acc, item) => acc + item.cantidad, 0);
    const blurayCount = carrito.filter(item => item.formato === 'bluray').reduce((acc, item) => acc + item.cantidad, 0);
    statDigital.textContent = digitalCount;
    statBluray.textContent = blurayCount;

    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    let descuentoMonto = 0;
    if (cuponAplicado) {
        descuentoMonto = subtotal * cuponesValidos[cuponAplicado];
    }
    statDiscount.textContent = `$${descuentoMonto.toFixed(2)}`;
}


function actualizarInterfaz() {
    renderizarCatalogo();
    renderizarCarrito();
    actualizarStats();
}

/**
 * Muestra los detalles de una película mediante un modal expandido de SweetAlert2
 * @param {number} peliculaId
 */
function mostrarDetallesPelicula(peliculaId) {
    const peli = peliculas.find(p => p.id === peliculaId);
    if (!peli) return;

    Swal.fire({
        title: peli.titulo,
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <p style="margin-bottom: 8px;"><strong>Fase en Marvel:</strong> Fase ${peli.fase}</p>
                <p style="margin-bottom: 8px;"><strong>Año de Lanzamiento:</strong> ${peli.estreno}</p>
                <p style="margin-bottom: 8px;"><strong>Orden Cronológico en la Historia:</strong> #${peli.ordenCronologico}</p>
                <p style="margin-bottom: 12px;"><strong>Director:</strong> ${peli.director}</p>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">
                <p style="font-style: italic; line-height: 1.5; color: #cbd5e1;">${peli.sinopsis}</p>
            </div>
        `,
        confirmButtonText: 'Cerrar',
        imageUrl: peli.imagen,
        imageHeight: 280,
        imageAlt: peli.titulo,
        didOpen: () => {
            const imgEl = Swal.getImage();
            if (imgEl) {
                imgEl.onerror = () => {
                    imgEl.style.display = 'none';
                };
            }
        },
        customClass: {
            popup: 'marvel-swal-theme',
            title: 'marvel-swal-theme',
            htmlContainer: 'marvel-swal-theme',
            confirmButton: 'marvel-swal-btn'
        }
    });
}


function iniciarSimulacionCheckout() {
    if (carrito.length === 0) return;

    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const descuento = cuponAplicado ? subtotal * cuponesValidos[cuponAplicado] : 0;
    const total = subtotal - descuento;

    Swal.fire({
        title: 'Formulario de Compra',
        html: `
            <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 15px;">Completa tus datos para simular la facturación del pedido.</p>
            <div class="checkout-form">
                <div class="form-group">
                    <label for="swal-input-name">Nombre Completo *</label>
                    <input type="text" id="swal-input-name" placeholder="Ej: Tony Stark">
                </div>
                <div class="form-group">
                    <label for="swal-input-email">Correo Electrónico *</label>
                    <input type="email" id="swal-input-email" placeholder="Ej: tony@starkindustries.com">
                </div>
                <div class="form-group">
                    <label for="swal-input-payment">Método de Pago *</label>
                    <select id="swal-input-payment">
                        <option value="credit">Tarjeta de Crédito (Simulada)</option>
                        <option value="paypal">PayPal (Simulado)</option>
                        <option value="transfer">Gemas del Infinito / Transferencia</option>
                    </select>
                </div>
            </div>
            <div class="checkout-totals-summary">
                <div class="summary-row">
                    <span>Artículos Totales:</span>
                    <span>${carrito.reduce((acc, item) => acc + item.cantidad, 0)}</span>
                </div>
                ${cuponAplicado ? `
                <div class="summary-row" style="color: #10b981;">
                    <span>Cupón (${cuponAplicado}):</span>
                    <span>-$${descuento.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="summary-row final">
                    <span>Total a Pagar:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Proceder al Pago',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        customClass: {
            popup: 'marvel-swal-theme',
            title: 'marvel-swal-theme',
            htmlContainer: 'marvel-swal-theme',
            confirmButton: 'marvel-swal-btn',
            cancelButton: 'marvel-swal-btn-secondary'
        },

        preConfirm: () => {
            const name = document.getElementById('swal-input-name').value.trim();
            const email = document.getElementById('swal-input-email').value.trim();
            const payment = document.getElementById('swal-input-payment').value;

            if (!name || !email) {
                Swal.showValidationMessage('Todos los campos marcados con * son requeridos');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Swal.showValidationMessage('Por favor ingresa un correo electrónico válido');
                return false;
            }

            return { nombre: name, correo: email, metodoPago: payment };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const datosCliente = result.value;

            Swal.fire({
                title: 'Procesando Transacción',
                html: 'Conectando con la pasarela de pago segura de S.H.I.E.L.D...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                customClass: {
                    popup: 'marvel-swal-theme',
                    title: 'marvel-swal-theme',
                    htmlContainer: 'marvel-swal-theme'
                }
            });

            setTimeout(() => {
                generarFacturaFinal(datosCliente, subtotal, descuento, total);
            }, 1800);
        }
    });
}

/**
 * Genera y muestra la factura digital detallada en pantalla, finalizando el proceso
 * @param {object} cliente - Datos del cliente validados
 * @param {number} subtotal - Subtotal de la compra
 * @param {number} descuento - Descuento en dólares
 * @param {number} total - Total final en dólares
 */
function generarFacturaFinal(cliente, subtotal, descuento, total) {
    const fecha = new Date().toLocaleString('es-ES');
    const ticketId = Math.floor(100000 + Math.random() * 900000);


    let textoPago = 'Tarjeta de Crédito';
    if (cliente.metodoPago === 'paypal') textoPago = 'PayPal';
    if (cliente.metodoPago === 'transfer') textoPago = 'Transferencia Asgardiana';


    let itemsHTML = '';
    carrito.forEach(item => {
        itemsHTML += `
            <div class="invoice-item">
                <span>${item.cantidad}x ${item.titulo} (${item.formato === 'digital' ? 'DIGITAL' : 'BLU-RAY'})</span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
        `;
    });


    Swal.fire({
        title: '¡Compra Exitosa!',
        html: `
            <p style="font-size: 0.9rem; color: #10b981; font-weight: 600; margin-bottom: 15px;">
                <i class="fa-solid fa-circle-check"></i> El pago ha sido confirmado. ¡Gracias por tu compra!
            </p>
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="invoice-title">MCU MOVIE TICKET</div>
                    <div class="invoice-meta">Ticket: #${ticketId} | Fecha: ${fecha}</div>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Cliente:</strong> ${cliente.nombre}<br>
                    <strong>Email:</strong> ${cliente.correo}<br>
                    <strong>Pago:</strong> ${textoPago}
                </div>
                <div class="invoice-list">
                    ${itemsHTML}
                </div>
                <div class="invoice-totals">
                    <div class="invoice-row">
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    ${descuento > 0 ? `
                    <div class="invoice-row" style="color: #10b981;">
                        <span>Descuento (${cuponAplicado}):</span>
                        <span>-$${descuento.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="invoice-row bold">
                        <span>TOTAL COMPRA:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>
                <div class="invoice-footer">
                    DISFRUTA DE TU MARATÓN DEL MULTIVERSO<br>
                    ¡EL COMPRADOR TIENE PODERES ABSOLUTOS!
                </div>
            </div>
        `,
        confirmButtonText: 'Aceptar y Cerrar',
        icon: 'success',
        customClass: {
            popup: 'marvel-swal-theme',
            title: 'marvel-swal-theme',
            htmlContainer: 'marvel-swal-theme',
            confirmButton: 'marvel-swal-btn'
        }
    }).then(() => {
        vaciarCarrito();
    });
}
