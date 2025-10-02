const listaPokemon = document.getElementById('listaPokemon');
const paginacion = document.getElementById('paginacion');
const botonesHeader = document.querySelectorAll('.btn-header:not(.buscar-btn):not(.theme-toggle)'); // Todos los botones excepto el de buscar y el de tema
const searchInput = document.getElementById('buscar-input');
const URL = "https://pokeapi.co/api/v2/pokemon/";
const searchBtn = document.querySelector(".buscar-btn");
const ultimasBusquedasDiv = document.getElementById("ultimas-busquedas");

const modal = document.getElementById("pokemon-modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
const MAX_HISTORIAL = 10; // Máximo número de búsquedas a guardar

let paginaActual = 1;
const limitePorPagina = 24;
let totalPaginas = 0;
let listaFiltrada = null; // lista de Pokémon filtrados por tipo, null = todos
let historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas')) || []; // Array para almacenar el historial de búsquedas
let favoritos = JSON.parse(localStorage.getItem('favoritos')) || []; // Array para almacenar los IDs de los Pokémon favoritos


function normalizarFavoritos() {
  let huboCambios = false;
  favoritos = favoritos.map(fav => {
    if (!fav) return fav;
    if (!fav.url) {
      const url = fav.id ? (URL + fav.id + '/') : (fav.name ? (URL + fav.name + '/') : null);
      if (url) {
        huboCambios = true;
        return { ...fav, url };
      }
    }
    return fav;
  });
  if (huboCambios) {
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
  }
}

normalizarFavoritos();


async function buscarPokemon() {
  const pokemonBuscado = searchInput.value.trim().toLowerCase();
  if (!pokemonBuscado) {
    alert("Por favor escribe un nombre de Pokémon");
    return;
  }
  try {
    const response = await fetch(URL + pokemonBuscado);
    const data = await response.json();
    const pokemon = [{ name: data.name, url: URL + data.id + '/' }];
    listaFiltrada = pokemon;
    paginaActual = 1;
    mostrarPokemon(paginaActual, listaFiltrada);
    mostrarModal(data);

    historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas')) || [];

    const nombre = data.name.toLowerCase();
    historialBusquedas = historialBusquedas.filter(n => n !== nombre);
    historialBusquedas.unshift(nombre);
    if (historialBusquedas.length > MAX_HISTORIAL) {
      historialBusquedas = historialBusquedas.slice(0, MAX_HISTORIAL);
    }
    localStorage.setItem('historialBusquedas', JSON.stringify(historialBusquedas));

    renderHistorial();
    // Limpiar el input de búsqueda tras una búsqueda exitosa
    searchInput.value = '';

  } catch (error) {
    alert("Pokémon no encontrado");
    console.error("Error al buscar Pokémon:", error);
  }
}


async function buscarPokemonPorNombre(nombre) {
  searchInput.value = nombre;
  await buscarPokemon();
}

function renderHistorial() {
  const historial = JSON.parse(localStorage.getItem('historialBusquedas')) || [];
  ultimasBusquedasDiv.innerHTML = '';
  historial.forEach(nombre => {
    const btn = document.createElement('button');
    btn.classList.add('historial-btn');
    btn.textContent = nombre;
    btn.addEventListener('click', () => buscarPokemonPorNombre(nombre));
    ultimasBusquedasDiv.appendChild(btn);
  });
}

searchBtn.addEventListener("click", buscarPokemon);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") buscarPokemon();
});

async function obtenerPokemon(pagina) {
  const offset = (pagina - 1) * limitePorPagina;
  const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limitePorPagina}`;
  const res = await fetch(url);
  const data = await res.json();

  totalPaginas = Math.ceil(data.count / limitePorPagina);
  return data.results;
}

// Mostrar Pokémon (puede recibir lista personalizada)
async function mostrarPokemon(pagina, lista = null) {
  let pokemons;

  if (lista) {
    const start = (pagina - 1) * limitePorPagina;
    const end = start + limitePorPagina;
    pokemons = lista.slice(start, end);
    totalPaginas = Math.ceil(lista.length / limitePorPagina);
  } else {
    pokemons = await obtenerPokemon(pagina);
  }

  listaPokemon.innerHTML = '';

  if (!pokemons || pokemons.length === 0) {
    listaPokemon.innerHTML = '<p class="no-results">No hay Pokémon para mostrar</p>';
    renderizarPaginacion();
    return;
  }

  const tarjetas = await Promise.all(
    pokemons.map(async (poke) => {
      try {
        const computedUrl = poke?.url ?? (poke?.id ? (URL + poke.id + '/') : (poke?.name ? (URL + poke.name + '/') : null));
        if (!computedUrl) throw new Error('Sin URL para cargar Pokémon');
        const res = await fetch(computedUrl);
        const info = await res.json();

        const idFormateado = String(info.id).padStart(4, '0');

        const tiposHTML = info.types
          .map(t => `<span class="tipo ${t.type.name}">${t.type.name}</span>`)
          .join(' ');

        const card = document.createElement('div');
        card.classList.add('pokemon-card');
        card.innerHTML = `
          <p class="pokemon-id">#${idFormateado}</p>
          <img src="${info.sprites.other['official-artwork'].front_default}" alt="${info.name}">
          <h3 class="pokemon-name">${info.name}</h3>
          <div class="pokemon-tipo">${tiposHTML}</div>
        `;

        card.addEventListener("click", () => {
          mostrarModal(info);
        });

        return card;
      } catch (e) {
        const card = document.createElement('div');
        card.classList.add('pokemon-card');
        card.innerHTML = `<p>Error cargando Pokémon</p>`;
        return card;
      }
    })
  );

  tarjetas.forEach(card => listaPokemon.appendChild(card));
  renderizarPaginacion();
}


// Paginación (Anterior/Siguiente)
function renderizarPaginacion() {
  paginacion.innerHTML = '';

  const btnAnterior = document.createElement('button');
  btnAnterior.textContent = 'Anterior';
  btnAnterior.disabled = paginaActual === 1;
  btnAnterior.addEventListener('click', () => {
    paginaActual--;
    mostrarPokemon(paginaActual, listaFiltrada);
  });

  const btnSiguiente = document.createElement('button');
  btnSiguiente.textContent = 'Siguiente';
  btnSiguiente.disabled = paginaActual === totalPaginas;
  btnSiguiente.addEventListener('click', () => {
    paginaActual++;
    mostrarPokemon(paginaActual, listaFiltrada);
  });

  paginacion.appendChild(btnAnterior);
  paginacion.appendChild(btnSiguiente);
}

// Botones de tipo en el header
botonesHeader.forEach(boton => {
  boton.addEventListener("click", async (event) => {
    const botonId = event.currentTarget.id;
    const button = event.currentTarget;
    
    paginaActual = 1;
    listaFiltrada = null;

    if (botonId === "ver-todos") {
      setActiveButton(button);
      mostrarPokemon(paginaActual);
      return;
    }

    if (botonId === "btn-favoritos") {
      setActiveButton(button);
      mostrarFavoritos();
      return;
    }

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/type/${botonId}`);
      const data = await res.json();
      listaFiltrada = data.pokemon.map(p => p.pokemon);
      
      setActiveButton(button);
      mostrarPokemon(paginaActual, listaFiltrada);
    } catch (error) {
      console.error('Error al cargar tipo de Pokémon:', error);
      alert('Error al cargar los Pokémon de este tipo');
    }
  });
});

function mostrarModal(info) {
  const idFormateado = String(info.id).padStart(4, '0');
  const tiposHTML = info.types
    .map(t => `<span class="tipo ${t.type.name}">${t.type.name}</span>`)
    .join(' ');

  modalBody.innerHTML = `
    <h2>#${idFormateado} - ${info.name}</h2>
    <img src="${info.sprites.other['official-artwork'].front_default}" alt="${info.name}" style="max-width:150px; display:block; margin:0 auto;">
    <p><b>Altura:</b> ${(info.height / 10).toFixed(1)} m</p>
    <p><b>Peso:</b> ${(info.weight / 10).toFixed(1)} kg</p>
    <div><b>Habilidades:</b> ${info.abilities.map(a => a.ability.name).join(', ')}</div>
    <div><b>Base stats:</b>
      <ul>
        ${info.stats.map(s => `<li>${s.stat.name}: ${s.base_stat}</li>`).join('')}
      </ul>
    </div>
    <div style="text-align:center; margin-top:15px;">
      <button id="btn-favorito" class="btn-favorito">⭐ Agregar a Favoritos</button>
    </div>
  `;

  modal.style.display = "block";

  // Vinculamos el botón recién creado
  const btnFav = document.getElementById("btn-favorito");
  btnFav.addEventListener("click", () => {
    agregarAFavoritos(info);
    modal.style.display = "none";
  });
}

function agregarAFavoritos(info) {
  const existe = favoritos.some(p => p.id === info.id);
  if (!existe) {
    favoritos.push({ id: info.id, name: info.name, img: info.sprites.other['official-artwork'].front_default, url: URL + info.id + '/' });
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
    alert(`${info.name} fue agregado a favoritos ⭐`);
  } else {
    alert(`${info.name} ya está en favoritos`);
  }
}

async function mostrarFavoritos() {
  if (favoritos.length === 0) {
    listaPokemon.innerHTML = "<p class='no-results'>No tienes Pokémon en favoritos ⭐</p>";
    return;
  }

  // usamos la función mostrarPokemon con la lista de favoritos
  listaFiltrada = favoritos;  
  paginaActual = 1;
  mostrarPokemon(paginaActual, listaFiltrada);
}

modalClose.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});


// Theme Toggle
const toggleButton = document.getElementById('toggle-theme');
const root = document.documentElement;

// Detectar preferencia guardada
if (localStorage.getItem('theme') === 'dark') {
  root.classList.add('dark-mode');
  toggleButton.textContent = "☀️ Modo Claro";
} else {
  toggleButton.textContent = "🌙 Modo Oscuro";
}

toggleButton.addEventListener('click', () => {
  root.classList.toggle('dark-mode');

  if (root.classList.contains('dark-mode')) {
    toggleButton.textContent = "☀️ Modo Claro";
    localStorage.setItem('theme', 'dark');
  } else {
    toggleButton.textContent = "🌙 Modo Oscuro";
    localStorage.setItem('theme', 'light');
  }
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menu-toggle');
const navFilters = document.getElementById('nav-filters');
let activeButton = null;

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  navFilters.classList.toggle('show');
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav') && navFilters.classList.contains('show')) {
    menuToggle.classList.remove('open');
    navFilters.classList.remove('show');
  }
});

function setActiveButton(button) {
  if (activeButton) {
    activeButton.classList.remove('active');
  }
  
  if (button) {
    button.classList.add('active');
    activeButton = button;
  }
  
  if (window.innerWidth <= 768) {
    menuToggle.classList.remove('open');
    navFilters.classList.remove('show');
  }
}


mostrarPokemon(paginaActual);
renderHistorial();
