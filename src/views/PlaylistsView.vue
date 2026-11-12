<template>
  <div class="playlists-page">
    <!-- Mensajes de Confirmación y Error -->
    <div v-if="mensaje" class="alert-box alert-success">
      <AppIcon name="check" :size="16" />
      <div class="alert-text">{{ mensaje }}</div>
      <button class="alert-close" @click="mensaje = ''">
        <AppIcon name="close" :size="15" />
      </button>
    </div>
    <div v-if="errorMensaje" class="alert-box alert-error">
      <AppIcon name="alert" :size="16" />
      <div class="alert-text">{{ errorMensaje }}</div>
      <button class="alert-close" @click="errorMensaje = ''">
        <AppIcon name="close" :size="15" />
      </button>
    </div>

    <!-- =================================================================== -->
    <!-- VISTA 1: DETALLE DE UNA PLAYLIST SELECCIONADA (SPOTIFY / YT MUSIC)  -->
    <!-- =================================================================== -->
    <div v-if="playlistActual" class="playlist-detail-view">
      <!-- Barra superior de retorno -->
      <div class="detail-nav-top">
        <button class="back-pill" @click="volverATodasLasPlaylists">
          <AppIcon name="arrow-left" :size="15" />
          <span>Todas las playlists</span>
        </button>
        <span class="org-tag">
          {{ auth.currentUser.value?.organizacion_nombre }}
        </span>
      </div>

      <!-- Cabecera Hero estilo Spotify / YouTube Music -->
      <header class="playlist-hero">
        <div class="hero-cover-box" @click="reproducirTodaLaPlaylist">
          <img
            v-if="playlistActual.portada_url"
            :src="playlistActual.portada_url"
            :alt="playlistActual.nombre"
            class="hero-single-cover"
          />
          <div
            v-else-if="playlistActual.collage_portadas && playlistActual.collage_portadas.length >= 4"
            class="hero-collage-grid"
          >
            <img
              v-for="(imgUrl, idx) in playlistActual.collage_portadas.slice(0, 4)"
              :key="idx"
              :src="imgUrl"
              alt="Portada"
            />
          </div>
          <img
            v-else-if="playlistActual.collage_portadas && playlistActual.collage_portadas.length > 0"
            :src="playlistActual.collage_portadas[0]"
            :alt="playlistActual.nombre"
            class="hero-single-cover"
          />
          <div v-else class="hero-empty-cover">
            <AppIcon name="music" :size="54" />
          </div>
        </div>

        <div class="hero-info">
          <div class="hero-type-row">
            <span class="visibility-label">
              {{ playlistActual.es_publica ? 'Playlist pública' : 'Playlist privada' }}
            </span>
            <span class="platform-chip">
              {{ etiquetaPlataforma(playlistActual.plataforma_origen) }}
            </span>
            <span v-if="gruposRepetidosEnMismaPlaylist.length" class="dup-hero-badge">
              <AppIcon name="repeat" :size="13" />
              <span>
                {{ gruposRepetidosEnMismaPlaylist.length }}
                {{ gruposRepetidosEnMismaPlaylist.length === 1 ? 'canción repetida en esta lista' : 'canciones repetidas en esta lista' }}
              </span>
            </span>
          </div>

          <h1 class="hero-title">{{ playlistActual.nombre }}</h1>

          <p v-if="playlistActual.descripcion" class="hero-desc">
            {{ playlistActual.descripcion }}
          </p>

          <div class="hero-meta-line">
            <span class="creator-avatar">
              {{ obtenerIniciales(playlistActual.creador_nombre || auth.currentUser.value?.nombre) }}
            </span>
            <strong class="creator-name">
              {{ playlistActual.creador_nombre || auth.currentUser.value?.nombre }}
            </strong>
            <span class="meta-dot">•</span>
            <span>{{ cancionesEnPlaylist.length }} {{ cancionesEnPlaylist.length === 1 ? 'canción' : 'canciones' }}</span>
            <span class="meta-dot">,</span>
            <span class="meta-duration">cerca de {{ formatearDuracionTotal(playlistActual.duracion_total_segundos) }}</span>
          </div>
        </div>
      </header>

      <!-- Barra de Controles y Píldoras -->
      <div class="playlist-controls-bar">
        <div class="controls-left">
          <button
            class="big-play-btn"
            title="Reproducir playlist"
            :disabled="!cancionesEnPlaylist.length"
            @click="reproducirTodaLaPlaylist"
          >
            <AppIcon name="play" :size="24" />
          </button>

          <button
            class="icon-circle-btn"
            title="Reproducción aleatoria"
            :disabled="!cancionesEnPlaylist.length"
            @click="reproducirAleatoria"
          >
            <AppIcon name="shuffle" :size="18" />
          </button>

          <div class="action-pills-group">
            <button
              v-if="auth.canManagePlaylists.value"
              class="action-pill action-pill-plus"
              :class="{ active: panelActivoEnPlaylist === 'agregar' }"
              title="Agregar canción a la playlist"
              @click="alternarPanelPlaylist('agregar')"
            >
              <AppIcon name="plus" :size="17" />
            </button>

            <button
              class="action-pill pill-repeated"
              :class="{ active: panelActivoEnPlaylist === 'repetidas' || soloMostrarRepetidas }"
              @click="alternarPanelPlaylist('repetidas')"
            >
              <AppIcon name="repeat" :size="15" />
              <span>Canciones repetidas</span>
              <span class="pill-counter">{{ gruposRepetidosEnMismaPlaylist.length }}</span>
            </button>

            <button
              v-if="auth.canManagePlaylists.value"
              class="action-pill"
              @click="editarPlaylist(playlistActual)"
            >
              <AppIcon name="edit" :size="15" />
              <span>Nombre y datos</span>
            </button>

            <button
              v-if="auth.canManagePlaylists.value"
              class="action-pill pill-danger"
              @click="playlistPorEliminar = playlistActual"
            >
              <AppIcon name="trash" :size="15" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>

        <div class="controls-right">
          <div class="inline-track-search">
            <AppIcon name="search" :size="15" />
            <input
              v-model="busquedaDentroDePlaylist"
              type="text"
              placeholder="Buscar en la playlist..."
            />
          </div>

          <CustomSelect
            v-model="ordenDentroDePlaylist"
            :options="opcionesOrdenDentroPlaylist"
          />
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- PANEL INTEGRADO: CANCIONES REPETIDAS EN ESTA MISMA PLAYLIST       -->
      <!-- ================================================================= -->
      <section v-if="panelActivoEnPlaylist === 'repetidas'" class="integrated-panel repeated-panel">
        <div class="integrated-panel-head">
          <div>
            <span class="tiny accent">DETECTOR DE REPETIDAS EN ESTA PLAYLIST</span>
            <h3>Canciones agregadas más de una vez en "{{ playlistActual.nombre }}"</h3>
            <p class="subtext">
              Si agregaste una canción sin saber que ya estaba en esta playlist, aquí puedes ver cuál es y elegir si quieres sacar la copia repetida o dejarla.
            </p>
          </div>
          <button class="outline btn-sm" @click="panelActivoEnPlaylist = null">
            <AppIcon name="close" :size="14" />
            <span>Cerrar</span>
          </button>
        </div>

        <div class="repeated-actions-bar">
          <button
            class="action-pill"
            :class="{ active: soloMostrarRepetidas }"
            @click="soloMostrarRepetidas = !soloMostrarRepetidas"
          >
            <AppIcon name="search" :size="14" />
            <span>{{ soloMostrarRepetidas ? 'Mostrando solo repetidas en la tabla' : 'Filtrar tabla: Ver solo repetidas' }}</span>
          </button>

          <button
            v-if="auth.canManagePlaylists.value && duplicadasMismaListaCount > 0"
            class="primary btn-sm"
            @click="depurarDuplicadasEnEstaPlaylist"
          >
            <AppIcon name="check" :size="14" />
            <span>Sacar todas las copias repetidas ({{ duplicadasMismaListaCount }})</span>
          </button>
        </div>

        <div v-if="!gruposRepetidosEnMismaPlaylist.length" class="rep-clean-banner">
          <AppIcon name="check" :size="18" />
          <div>
            <strong>No hay canciones repetidas en esta playlist</strong>
            <small>Ninguna canción fue agregada dos veces dentro de "{{ playlistActual.nombre }}".</small>
          </div>
        </div>

        <div v-else class="rep-items-list">
          <div
            v-for="grupo in gruposRepetidosEnMismaPlaylist"
            :key="grupo.clave"
            class="rep-item-row"
          >
            <div class="rep-item-info">
              <img
                v-if="grupo.cancion?.portada_url"
                :src="grupo.cancion.portada_url"
                :alt="grupo.cancion?.titulo"
                class="rep-thumb"
              />
              <div v-else class="rep-thumb rep-thumb-empty">
                <AppIcon name="music" :size="16" />
              </div>
              <div>
                <strong>{{ grupo.cancion?.titulo }}</strong>
                <small>{{ grupo.cancion?.artista }} • {{ grupo.cancion?.album || 'Single' }}</small>
              </div>
            </div>

            <div class="rep-item-badges">
              <span class="badge-same-list">
                <AppIcon name="repeat" :size="12" />
                <span>
                  Está {{ grupo.apariciones.length }} veces en esta playlist (Posiciones #{{ grupo.posiciones.join(' y #') }})
                </span>
              </span>
            </div>

            <div v-if="auth.canManagePlaylists.value" class="rep-decision-btns">
              <button
                class="primary btn-xs"
                @click="sacarCopiasExtrasDeCancion(grupo)"
              >
                <AppIcon name="trash" :size="13" />
                <span>Sacar copia repetida (dejar 1)</span>
              </button>
              <button
                class="outline btn-xs"
                @click="ignorarRepetidaTemporal(grupo.clave)"
              >
                <span>Conservar ambas</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- PANEL INTEGRADO: AGREGAR CANCIONES (BÚSQUEDA AUTOMÁTICA EN VIVO)  -->
      <!-- ================================================================= -->
      <section v-if="panelActivoEnPlaylist === 'agregar'" class="integrated-panel add-songs-panel">
        <div class="integrated-panel-head">
          <div>
            <span class="tiny accent">AGREGAR PISTAS A {{ playlistActual.nombre.toUpperCase() }}</span>
            <h3>Añadir desde tu biblioteca o buscar en vivo</h3>
          </div>
          <button class="outline btn-sm" @click="panelActivoEnPlaylist = null">
            <AppIcon name="close" :size="14" />
            <span>Cerrar</span>
          </button>
        </div>

        <div class="add-tabs-row">
          <button
            class="action-pill"
            :class="{ active: modoAgregarCancion === 'catalogo' }"
            @click="modoAgregarCancion = 'catalogo'"
          >
            <AppIcon name="music" :size="15" />
            <span>Desde el catálogo ({{ todasLasCanciones.length }})</span>
          </button>
          <button
            v-if="auth.canExtractFromApis.value"
            class="action-pill"
            :class="{ active: modoAgregarCancion === 'api' }"
            @click="modoAgregarCancion = 'api'"
          >
            <AppIcon name="bolt" :size="15" />
            <span>Buscar en Spotify / YT Music / YouTube</span>
          </button>
        </div>

        <!-- Submodo 1: Catálogo de la organización (búsqueda instantánea) -->
        <div v-if="modoAgregarCancion === 'catalogo'" class="catalog-picker">
          <div class="instant-search-input-wrap">
            <AppIcon name="search" :size="16" />
            <input
              v-model="filtroCatalogoAgregar"
              type="text"
              placeholder="Escribe para buscar automáticamente en tu catálogo..."
              class="search-input-clean"
            />
          </div>
          <div class="catalog-picker-list">
            <div
              v-for="cancion in cancionesCatalogoParaAgregar"
              :key="cancion.id"
              class="catalog-picker-item"
            >
              <div class="picker-left">
                <img
                  v-if="cancion.portada_url"
                  :src="cancion.portada_url"
                  :alt="cancion.titulo"
                  class="rep-thumb"
                />
                <div v-else class="rep-thumb rep-thumb-empty">
                  <AppIcon name="music" :size="16" />
                </div>
                <div class="picker-track-text-wrap">
                  <div class="picker-track-title-wrap">
                    <MarqueeText :text="cancion.titulo" class="picker-track-title" />
                  </div>
                  <div class="picker-track-artist-wrap">
                    <MarqueeText :text="cancion.artista" class="picker-track-artist" />
                    <small class="picker-track-sub">
                      • {{ etiquetaPlataforma(cancion.plataforma_origen) }}
                      <span v-if="estaEnPlaylistActual(cancion)" class="already-in-tag">
                        • Ya está en esta lista
                      </span>
                    </small>
                  </div>
                </div>
              </div>
              <div class="picker-actions">
                <button
                  class="icon-circle-sm"
                  title="Escuchar canción entera"
                  @click="reproducirCancion(cancion)"
                >
                  <AppIcon name="play" :size="13" />
                </button>
                <button
                  class="icon-add-circle"
                  title="Agregar canción a la playlist"
                  @click="agregarCancionAPlaylist(cancion.id)"
                >
                  <AppIcon name="plus" :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Submodo 2: Búsqueda en vivo automática en API hacia la playlist -->
        <div v-else class="api-picker">
          <div class="api-quick-bar">
            <CustomSelect
              v-model="plataformaApiPlaylist"
              :options="opcionesPlataformaApi"
            />
            <div class="instant-search-input-wrap">
              <AppIcon name="search" :size="16" />
              <input
                v-model="consultaApiPlaylist"
                type="text"
                placeholder="Escribe un artista o canción y los resultados aparecerán automáticamente..."
                class="search-input-clean"
              />
              <span v-if="buscandoEnApi" class="searching-badge">Buscando...</span>
            </div>
          </div>

          <div v-if="resultadosApiPlaylist.length" class="catalog-picker-list">
            <div
              v-for="track in resultadosApiPlaylist"
              :key="track.external_id"
              class="catalog-picker-item"
            >
              <div class="picker-left">
                <img
                  v-if="track.portada_url"
                  :src="track.portada_url"
                  :alt="track.titulo"
                  class="rep-thumb"
                />
                <div v-else class="rep-thumb rep-thumb-empty">
                  <AppIcon name="music" :size="16" />
                </div>
                <div class="picker-track-text-wrap">
                  <div class="picker-track-title-wrap">
                    <MarqueeText :text="track.titulo" class="picker-track-title" />
                  </div>
                  <div class="picker-track-artist-wrap">
                    <MarqueeText :text="track.artista" class="picker-track-artist" />
                    <small class="picker-track-sub">
                      • {{ etiquetaPlataforma(track.plataforma_origen || plataformaApiPlaylist) }} • {{ formatearDuracion(track.duracion_segundos) }}
                      <span v-if="estaEnPlaylistActual(track)" class="already-in-tag">
                        • Ya está en esta lista
                      </span>
                    </small>
                  </div>
                </div>
              </div>
              <div class="picker-actions">
                <button
                  class="icon-circle-sm"
                  title="Escuchar canción entera"
                  @click="reproducirCancion(track)"
                >
                  <AppIcon name="play" :size="13" />
                </button>
                <button
                  class="icon-add-circle"
                  title="Agregar canción a la playlist"
                  @click="extraerYAgregarAPlaylist(track)"
                >
                  <AppIcon name="plus" :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- TABLA DE CANCIONES ESTILO SPOTIFY / YOUTUBE MUSIC                 -->
      <!-- ================================================================= -->
      <div class="tracklist-container">
        <div v-if="!cancionesFiltradasEnPlaylist.length" class="empty-tracks-box">
          <p v-if="soloMostrarRepetidas">
            No hay canciones repetidas en esta playlist.
          </p>
          <p v-else>
            Esta playlist aún no tiene canciones. Usa el botón <strong>+ Agregar</strong> para sumar pistas.
          </p>
        </div>

        <table v-else class="spotify-track-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-title">Título</th>
              <th class="col-album">Álbum</th>
              <th class="col-date">Fecha en que se agregó</th>
              <th class="col-duration" title="Duración">
                <AppIcon name="clock" :size="15" />
              </th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in cancionesFiltradasEnPlaylist"
              :key="item.id"
              class="track-row"
              :class="{
                'is-playing': player.currentTrack.value?.id === item.canciones?.id,
                'is-repeated-row': item.repetida_en_misma_lista
              }"
              @dblclick="reproducirCancionDeLista(item.canciones)"
            >
              <td class="col-num">
                <button
                  class="row-play-trigger"
                  title="Reproducir canción entera"
                  @click="reproducirCancionDeLista(item.canciones)"
                >
                  <span class="num-text">{{ item.orden_numero || idx + 1 }}</span>
                  <span class="play-icon-hover">
                    <AppIcon name="play" :size="14" />
                  </span>
                </button>
              </td>

              <td class="col-title">
                <div class="track-main-cell">
                  <img
                    v-if="item.canciones?.portada_url"
                    :src="item.canciones.portada_url"
                    :alt="item.canciones?.titulo"
                    class="track-cover-sm"
                  />
                  <div v-else class="track-cover-sm track-cover-fallback">
                    <AppIcon name="music" :size="16" />
                  </div>

                  <div class="track-title-stack">
                    <div class="track-name-line">
                      <div class="track-name-marquee-wrap">
                        <MarqueeText :text="item.canciones?.titulo" class="track-name" />
                      </div>
                      <span
                        v-if="item.repetida_en_misma_lista"
                        class="inline-dup-pill same-list"
                        :title="`Esta canción está repetida ${item.veces_en_lista} veces en esta playlist (posiciones #${item.posiciones_en_lista?.join(', #')})`"
                      >
                        <AppIcon name="repeat" :size="11" />
                        <span>
                          {{ item.es_copia_duplicada ? `Copia repetida (#${item.posiciones_en_lista?.join(', #')})` : `Repetida ${item.veces_en_lista} veces (#${item.posiciones_en_lista?.join(', #')})` }}
                        </span>
                      </span>
                    </div>
                    <div class="track-artist-line">
                      <span class="platform-mini-tag">
                        {{ etiquetaPlataforma(item.canciones?.plataforma_origen) }}
                      </span>
                      <div class="track-artist-marquee-wrap">
                        <MarqueeText :text="item.canciones?.artista" class="artist-sub" />
                      </div>
                    </div>
                  </div>
                </div>
              </td>

              <td class="col-album">
                {{ item.canciones?.album || 'Single' }}
              </td>

              <td class="col-date">
                {{ formatearFechaCorta(item.agregado_en) }}
              </td>

              <td class="col-duration">
                {{ formatearDuracion(item.canciones?.duracion_segundos) }}
              </td>

              <td class="col-actions">
                <button
                  v-if="auth.canManagePlaylists.value"
                  class="row-remove-btn"
                  :title="item.repetida_en_misma_lista ? 'Sacar esta copia repetida de la playlist' : 'Quitar de la playlist'"
                  @click="quitarCancionDePlaylist(item.id)"
                >
                  <AppIcon name="trash" :size="15" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- VISTA 2: TODAS LAS PLAYLISTS (CUADRADOS 4 POR FILA RESPONSIVE)      -->
    <!-- =================================================================== -->
    <div v-else class="all-playlists-view">
      <!-- Barra de filtros estilo YouTube Music / Spotify -->
      <div class="library-top-header">
        <div class="library-pills">
          <button
            class="lib-filter-pill"
            :class="{ active: filtroVisibilidad === 'todas' }"
            @click="filtroVisibilidad = 'todas'"
          >
            Playlists ({{ playlists.length }})
          </button>
          <button
            class="lib-filter-pill"
            :class="{ active: filtroVisibilidad === 'publicas' }"
            @click="filtroVisibilidad = 'publicas'"
          >
            Públicas
          </button>
          <button
            class="lib-filter-pill"
            :class="{ active: filtroVisibilidad === 'privadas' }"
            @click="filtroVisibilidad = 'privadas'"
          >
            Privadas
          </button>
          <button
            class="lib-filter-pill"
            :class="{ active: filtroVisibilidad === 'con_repetidas' }"
            @click="filtroVisibilidad = 'con_repetidas'"
          >
            <AppIcon name="repeat" :size="14" />
            <span>Con repetidas</span>
          </button>
        </div>

        <div class="library-right-tools">
          <div class="lib-search-box">
            <AppIcon name="search" :size="15" />
            <input
              v-model="filtroBusqueda"
              type="text"
              placeholder="Buscar playlist..."
            />
          </div>

          <CustomSelect
            v-model="criterioOrden"
            :options="opcionesOrdenPlaylists"
          />

          <button
            v-if="auth.canExtractFromApis.value"
            class="lib-action-btn outline-accent"
            @click="abrirModalImportarApi"
          >
            <AppIcon name="bolt" :size="15" />
            <span>Extraer de mis cuentas</span>
          </button>

          <button
            v-if="auth.canManagePlaylists.value"
            class="lib-action-btn primary-lime"
            @click="abrirModalNuevaPlaylist"
          >
            <AppIcon name="plus" :size="15" />
            <span>Nueva playlist</span>
          </button>
        </div>
      </div>

      <!-- Grid de Tarjetas Cuadradas: 4 por fila en escritorio, adaptable por resolución -->
      <div v-if="!playlistsFiltradasYOrdenadas.length" class="empty-library-box">
        <p>No se encontraron playlists con el filtro actual.</p>
      </div>

      <div v-else class="square-playlists-grid">
        <article
          v-for="pl in playlistsFiltradasYOrdenadas"
          :key="pl.id"
          class="square-playlist-card"
          @click="seleccionarPlaylist(pl)"
        >
          <!-- Portada Cuadrada 1:1 (Collage 2x2 o Imagen) -->
          <div class="square-artwork-wrapper">
            <img
              v-if="pl.portada_url"
              :src="pl.portada_url"
              :alt="pl.nombre"
              class="square-single-img"
            />
            <div
              v-else-if="pl.collage_portadas && pl.collage_portadas.length >= 4"
              class="square-collage-2x2"
            >
              <img
                v-for="(imgUrl, idx) in pl.collage_portadas.slice(0, 4)"
                :key="idx"
                :src="imgUrl"
                alt="Portada"
              />
            </div>
            <img
              v-else-if="pl.collage_portadas && pl.collage_portadas.length > 0"
              :src="pl.collage_portadas[0]"
              :alt="pl.nombre"
              class="square-single-img"
            />
            <div v-else class="square-fallback-art">
              <AppIcon name="music" :size="48" />
            </div>

            <!-- Etiqueta superior si tiene canciones repetidas dentro de esa misma playlist -->
            <span v-if="pl.repetidas_count > 0" class="card-dup-badge">
              <AppIcon name="repeat" :size="12" />
              <span>{{ pl.repetidas_count }} {{ pl.repetidas_count === 1 ? 'repetida' : 'repetidas' }}</span>
            </span>

            <!-- Botón de Play flotante al pasar el mouse -->
            <button
              class="hover-play-fab"
              title="Abrir y reproducir"
              @click.stop="seleccionarYReproducir(pl)"
            >
              <AppIcon name="play" :size="20" />
            </button>
          </div>

          <!-- Texto inferior estilo YouTube Music / Spotify -->
          <div class="square-card-info">
            <h3 class="square-card-title">{{ pl.nombre }}</h3>
            <p class="square-card-sub">
              Playlist • {{ pl.creador_nombre || auth.currentUser.value?.nombre }} • {{ pl.total_canciones || 0 }} canciones
            </p>
          </div>
        </article>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- MODAL: EXTRAER PLAYLISTS DESDE CUENTAS (SPOTIFY / YOUTUBE MUSIC / YT)-->
    <!-- =================================================================== -->
    <div v-if="mostrarModalApi" class="modal-backdrop" @click.self="mostrarModalApi = false">
      <div class="modal-card modal-large panel">
        <div class="panel-head">
          <div>
            <span class="tiny accent">EXTRACCIÓN AUTOMÁTICA DE LISTAS</span>
            <h3>Extraer Playlists de tus Cuentas Vinculadas</h3>
          </div>
          <button class="outline btn-sm" @click="mostrarModalApi = false">
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <div class="import-grid">
          <div v-for="pl in playlistsExternasDisponibles" :key="pl.externalId" class="import-card">
            <div>
              <div class="flex items-center gap-2 mb-1" style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <AppIcon :name="pl.plataforma_origen" :size="16" />
                <span class="tiny accent font-bold">{{ pl.plataforma_origen === 'youtube_music' ? 'YT MUSIC' : pl.plataforma_origen.toUpperCase() }}</span>
              </div>
              <h4>{{ pl.nombre }}</h4>
              <p>{{ pl.descripcion }}</p>
              <small>{{ pl.canciones.length }} canciones listas para sincronizar</small>
            </div>
            <button class="primary btn-sm btn-icon-flex" @click="importarPlaylistExterna(pl)">
              <AppIcon name="bolt" :size="14" />
              <span>Extraer ahora</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- MODAL: CREAR / EDITAR PLAYLIST                                      -->
    <!-- =================================================================== -->
    <div v-if="mostrarModal" class="modal-backdrop" @click.self="cerrarModal">
      <div class="modal-card panel">
        <div class="panel-head">
          <div>
            <span class="tiny">{{ editandoId ? 'MODIFICAR DATOS DE LA LISTA' : 'NUEVA PLAYLIST' }}</span>
            <h3>{{ editandoId ? 'Editar nombre y datos' : 'Crear nueva playlist' }}</h3>
          </div>
          <button class="outline btn-sm" @click="cerrarModal">
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <form class="playlist-form" novalidate @submit.prevent="guardarPlaylist">
          <div class="form-group">
            <label>Nombre de la playlist *</label>
            <input
              v-model="nombre"
              type="text"
              placeholder="Ej. Gavilan, Favoritas 2026, Noche de Estudio"
              required
              maxlength="150"
            />
          </div>

          <div class="form-group">
            <label>Descripción</label>
            <textarea
              v-model="descripcion"
              rows="3"
              placeholder="Agrega una descripción opcional..."
              maxlength="300"
            ></textarea>
          </div>

          <div class="visibility-switch-box" @click="esPublica = !esPublica">
            <div class="visibility-switch-info">
              <span class="visibility-switch-title">Visibilidad de la playlist</span>
              <strong class="visibility-switch-state" :class="{ public: esPublica }">
                {{ esPublica ? 'Playlist Pública' : 'Playlist Privada' }}
              </strong>
              <small class="visibility-switch-desc">
                {{ esPublica ? 'Visible para todos los miembros de la plataforma.' : 'Solo visible en tu biblioteca personal.' }}
              </small>
            </div>
            <div class="switch-pill-wrap">
              <span class="switch-side-label" :class="{ active: !esPublica }">Privada</span>
              <button
                type="button"
                role="switch"
                :aria-checked="esPublica"
                class="modern-toggle-switch"
                :class="{ 'is-on': esPublica }"
                @click.stop="esPublica = !esPublica"
              >
                <span class="switch-thumb"></span>
              </button>
              <span class="switch-side-label" :class="{ active: esPublica }">Pública</span>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="primary" :disabled="cargando">
              {{ cargando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear playlist' }}
            </button>
            <button type="button" class="outline" :disabled="cargando" @click="cerrarModal">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- MODAL: CONFIRMACIÓN ANTES DE ELIMINAR PLAYLIST                      -->
    <!-- =================================================================== -->
    <div v-if="playlistPorEliminar" class="modal-backdrop" @click.self="playlistPorEliminar = null">
      <div class="modal-card panel">
        <span class="tiny danger-text">CONFIRMACIÓN REQUERIDA</span>
        <h3>¿Eliminar la playlist "{{ playlistPorEliminar.nombre }}"?</h3>
        <p class="subtext">
          Esta acción eliminará la lista de <strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong>. Las canciones seguirán en tu catálogo general.
        </p>
        <div class="modal-actions">
          <button class="danger-btn" @click="confirmarEliminacionPlaylist">
            <AppIcon name="trash" :size="14" />
            <span>Sí, eliminar playlist</span>
          </button>
          <button class="outline" @click="playlistPorEliminar = null">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import MarqueeText from '@/components/MarqueeText.vue'
import { useAuth } from '@/services/auth'
import { dbService } from '@/services/db'
import { CATALOGOS_SINCRONIZADOS, musicApiService } from '@/services/musicApis'
import { usePlayer } from '@/services/player'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const player = usePlayer()

const playlists = ref([])
const todasLasCanciones = ref([])
const cancionesEnPlaylist = ref([])
const playlistPorEliminar = ref(null)
const ignoradasTemporalmente = ref(new Set())

const cargando = ref(false)
const mensaje = ref('')
const errorMensaje = ref('')
const mostrarModal = ref(false)
const mostrarModalApi = ref(false)
const editandoId = ref(null)

// Filtros en vista general de Todas las Playlists
const filtroBusqueda = ref('')
const filtroVisibilidad = ref('todas')
const criterioOrden = ref('fecha_desc')

// Controles dentro de una Playlist seleccionada
const panelActivoEnPlaylist = ref(null) // null | 'agregar' | 'repetidas'
const soloMostrarRepetidas = ref(false)
const busquedaDentroDePlaylist = ref('')
const ordenDentroDePlaylist = ref('orden_original')
const modoAgregarCancion = ref('catalogo')
const filtroCatalogoAgregar = ref('')

// Búsqueda en API automática desde dentro de la Playlist
const plataformaApiPlaylist = ref('spotify')
const consultaApiPlaylist = ref('Coldplay')
const buscandoEnApi = ref(false)
const resultadosApiPlaylist = ref([])
let searchDebounceTimer = null

const opcionesOrdenDentroPlaylist = [
  { value: 'orden_original', label: 'Ordenar: Posición' },
  { value: 'titulo_asc', label: 'Título (A-Z)' },
  { value: 'artista_asc', label: 'Artista (A-Z)' },
  { value: 'fecha_desc', label: 'Agregadas recientemente' },
  { value: 'repetidas_primero', label: 'Repetidas primero' }
]

const opcionesPlataformaApi = [
  { value: 'spotify', label: 'Spotify', dot: '#1ed760' },
  { value: 'youtube_music', label: 'YT Music', dot: '#ff4e45' },
  { value: 'youtube', label: 'YouTube', dot: '#ff0000' }
]

const opcionesOrdenPlaylists = [
  { value: 'fecha_desc', label: 'Guardados recientemente' },
  { value: 'nombre_asc', label: 'Nombre (A - Z)' },
  { value: 'canciones_desc', label: 'Mayor cantidad de canciones' }
]

// Formulario Crear / Editar
const nombre = ref('')
const descripcion = ref('')
const esPublica = ref(false)

// Playlist activa según query param ?id=...
const playlistActual = computed(() => {
  const idQuery = route.query.id
  if (!idQuery) return null
  return playlists.value.find(p => p.id === idQuery) || null
})

const playlistsExternasDisponibles = computed(() => {
  return [
    ...CATALOGOS_SINCRONIZADOS.spotify.playlists,
    ...CATALOGOS_SINCRONIZADOS.youtube_music.playlists,
    ...CATALOGOS_SINCRONIZADOS.youtube.playlists
  ]
})

const playlistsFiltradasYOrdenadas = computed(() => {
  let lista = [...playlists.value]

  if (filtroBusqueda.value.trim()) {
    const q = filtroBusqueda.value.toLowerCase().trim()
    lista = lista.filter(
      p =>
        p.nombre?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
    )
  }

  if (filtroVisibilidad.value === 'publicas') {
    lista = lista.filter(p => p.es_publica === true)
  } else if (filtroVisibilidad.value === 'privadas') {
    lista = lista.filter(p => p.es_publica === false)
  } else if (filtroVisibilidad.value === 'con_repetidas') {
    lista = lista.filter(p => (p.repetidas_count || 0) > 0)
  }

  lista.sort((a, b) => {
    if (criterioOrden.value === 'fecha_desc') {
      return new Date(b.creado_en) - new Date(a.creado_en)
    }
    if (criterioOrden.value === 'nombre_asc') {
      return (a.nombre || '').localeCompare(b.nombre || '')
    }
    if (criterioOrden.value === 'canciones_desc') {
      return (b.total_canciones || 0) - (a.total_canciones || 0)
    }
    return 0
  })

  return lista
})

// Agrupación de canciones que se repiten DENTRO DE ESTA MISMA PLAYLIST
const gruposRepetidosEnMismaPlaylist = computed(() => {
  const grupos = {}
  for (const item of cancionesEnPlaylist.value) {
    if (!item.canciones) continue
    const clave =
      item.clave_cancion ||
      `${(item.canciones.titulo || '').toLowerCase().trim()}|${(item.canciones.artista || '').toLowerCase().trim()}`
    if (ignoradasTemporalmente.value.has(clave)) continue
    if (!grupos[clave]) {
      grupos[clave] = {
        clave,
        cancion: item.canciones,
        apariciones: [],
        posiciones: []
      }
    }
    grupos[clave].apariciones.push(item)
    grupos[clave].posiciones.push(item.orden_numero)
  }

  return Object.values(grupos).filter(g => g.apariciones.length > 1)
})

// Cantidad total de copias extra dentro de esta misma playlist
const duplicadasMismaListaCount = computed(() => {
  return gruposRepetidosEnMismaPlaylist.value.reduce(
    (acc, g) => acc + (g.apariciones.length - 1),
    0
  )
})

// Canciones filtradas y ordenadas en la tabla de la playlist activa
const cancionesFiltradasEnPlaylist = computed(() => {
  let lista = [...cancionesEnPlaylist.value]

  if (soloMostrarRepetidas.value) {
    lista = lista.filter(item => item.repetida_en_misma_lista)
  }

  if (busquedaDentroDePlaylist.value.trim()) {
    const q = busquedaDentroDePlaylist.value.toLowerCase().trim()
    lista = lista.filter(
      item =>
        item.canciones?.titulo?.toLowerCase().includes(q) ||
        item.canciones?.artista?.toLowerCase().includes(q) ||
        item.canciones?.album?.toLowerCase().includes(q)
    )
  }

  if (ordenDentroDePlaylist.value === 'titulo_asc') {
    lista.sort((a, b) => (a.canciones?.titulo || '').localeCompare(b.canciones?.titulo || ''))
  } else if (ordenDentroDePlaylist.value === 'artista_asc') {
    lista.sort((a, b) => (a.canciones?.artista || '').localeCompare(b.canciones?.artista || ''))
  } else if (ordenDentroDePlaylist.value === 'fecha_desc') {
    lista.sort((a, b) => new Date(b.agregado_en) - new Date(a.agregado_en))
  } else if (ordenDentroDePlaylist.value === 'repetidas_primero') {
    lista.sort((a, b) => Number(b.repetida_en_misma_lista) - Number(a.repetida_en_misma_lista))
  }

  return lista
})

const cancionesCatalogoParaAgregar = computed(() => {
  const q = filtroCatalogoAgregar.value.toLowerCase().trim()
  if (!q) return todasLasCanciones.value
  return todasLasCanciones.value.filter(
    c =>
      c.titulo?.toLowerCase().includes(q) ||
      c.artista?.toLowerCase().includes(q) ||
      c.album?.toLowerCase().includes(q)
  )
})

function estaEnPlaylistActual(cancion) {
  if (!cancion) return false
  const clave = `${(cancion.titulo || '').toLowerCase().trim()}|${(cancion.artista || '').toLowerCase().trim()}`
  return cancionesEnPlaylist.value.some(
    item =>
      item.canciones?.id === cancion.id ||
      `${(item.canciones?.titulo || '').toLowerCase().trim()}|${(item.canciones?.artista || '').toLowerCase().trim()}` === clave
  )
}

async function cargarDatos() {
  cargando.value = true
  errorMensaje.value = ''
  try {
    playlists.value = await dbService.getPlaylists()
    todasLasCanciones.value = await dbService.getCanciones()
    if (route.query.id) {
      await cargarCancionesDePlaylistActiva(route.query.id)
    }
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    cargando.value = false
  }
}

async function cargarCancionesDePlaylistActiva(playlistId) {
  if (!playlistId) {
    cancionesEnPlaylist.value = []
    return
  }
  try {
    dbService.markPlaylistUsed(playlistId)
    cancionesEnPlaylist.value = await dbService.getCancionesDePlaylist(playlistId)
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function seleccionarPlaylist(pl) {
  panelActivoEnPlaylist.value = null
  soloMostrarRepetidas.value = false
  ignoradasTemporalmente.value = new Set()
  dbService.markPlaylistUsed(pl.id)
  router.push({ path: '/playlists', query: { id: pl.id } })
}

async function seleccionarYReproducir(pl) {
  dbService.markPlaylistUsed(pl.id)
  await router.push({ path: '/playlists', query: { id: pl.id } })
  await cargarCancionesDePlaylistActiva(pl.id)
  reproducirTodaLaPlaylist()
}

function volverATodasLasPlaylists() {
  panelActivoEnPlaylist.value = null
  soloMostrarRepetidas.value = false
  router.push({ path: '/playlists' })
}

function alternarPanelPlaylist(nombrePanel) {
  if (panelActivoEnPlaylist.value === nombrePanel) {
    panelActivoEnPlaylist.value = null
  } else {
    panelActivoEnPlaylist.value = nombrePanel
    if (nombrePanel === 'agregar' && !resultadosApiPlaylist.value.length) {
      buscarEnApiParaPlaylist()
    }
  }
}

function reproducirCancion(cancion) {
  if (!cancion) return
  player.playTrack(cancion)
}

function reproducirCancionDeLista(cancion) {
  if (!cancion) return
  const listaCompleta = cancionesEnPlaylist.value.map(i => i.canciones).filter(Boolean)
  player.playTrack(cancion, listaCompleta)
}

function reproducirTodaLaPlaylist() {
  if (!cancionesEnPlaylist.value.length) return
  const listaCompleta = cancionesEnPlaylist.value.map(i => i.canciones).filter(Boolean)
  player.playTrack(listaCompleta[0], listaCompleta)
}

function reproducirAleatoria() {
  if (!cancionesEnPlaylist.value.length) return
  const listaCompleta = cancionesEnPlaylist.value.map(i => i.canciones).filter(Boolean)
  if (!player.isShuffle.value) {
    player.toggleShuffle()
  }
  const randomIdx = Math.floor(Math.random() * listaCompleta.length)
  player.playTrack(listaCompleta[randomIdx], listaCompleta)
}

async function agregarCancionAPlaylist(cancionId) {
  if (!playlistActual.value) return
  errorMensaje.value = ''
  try {
    const yaEstaba = cancionesEnPlaylist.value.some(i => i.canciones?.id === cancionId)
    await dbService.addCancionToPlaylist(playlistActual.value.id, cancionId)
    await cargarDatos()
    if (yaEstaba) {
      mensaje.value = 'Canción agregada nuevamente. Se detectó como repetida en esta playlist por si deseas revisarla.'
    } else {
      mensaje.value = 'Canción agregada a la playlist.'
    }
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function quitarCancionDePlaylist(relId) {
  if (!playlistActual.value) return
  errorMensaje.value = ''
  try {
    await dbService.removeCancionFromPlaylist(relId)
    await cargarDatos()
    mensaje.value = 'Canción quitada de la playlist.'
  } catch (err) {
    errorMensaje.value = err.message
  }
}

// Saca las copias repetidas de una canción específica dentro de esta playlist (conservando la primera)
async function sacarCopiasExtrasDeCancion(grupo) {
  if (!playlistActual.value || !grupo?.apariciones?.length) return
  errorMensaje.value = ''
  try {
    const copiasExtras = grupo.apariciones.slice(1)
    for (const copia of copiasExtras) {
      await dbService.removeCancionFromPlaylist(copia.id)
    }
    await cargarDatos()
    mensaje.value = `Se sacó la copia repetida de "${grupo.cancion?.titulo}" y quedó 1 sola vez en la playlist.`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function ignorarRepetidaTemporal(clave) {
  const nuevoSet = new Set(ignoradasTemporalmente.value)
  nuevoSet.add(clave)
  ignoradasTemporalmente.value = nuevoSet
  mensaje.value = 'Se conservaron ambas copias en la playlist.'
}

async function depurarDuplicadasEnEstaPlaylist() {
  if (!playlistActual.value) return
  errorMensaje.value = ''
  try {
    let eliminadas = 0
    for (const grupo of gruposRepetidosEnMismaPlaylist.value) {
      const extras = grupo.apariciones.slice(1)
      for (const copia of extras) {
        await dbService.removeCancionFromPlaylist(copia.id)
        eliminadas++
      }
    }
    await cargarDatos()
    mensaje.value = `Se sacaron ${eliminadas} copias repetidas de "${playlistActual.value.nombre}".`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function buscarEnApiParaPlaylist() {
  const q = consultaApiPlaylist.value.trim()
  if (!q) {
    resultadosApiPlaylist.value = []
    return
  }
  buscandoEnApi.value = true
  try {
    resultadosApiPlaylist.value = await musicApiService.searchTracksLive(
      q,
      plataformaApiPlaylist.value
    )
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    buscandoEnApi.value = false
  }
}

// Búsqueda automática instantánea al escribir en el buscador de API de la playlist
watch([consultaApiPlaylist, plataformaApiPlaylist], () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    if (panelActivoEnPlaylist.value === 'agregar' && modoAgregarCancion.value === 'api') {
      buscarEnApiParaPlaylist()
    }
  }, 280)
})

async function extraerYAgregarAPlaylist(track) {
  if (!playlistActual.value) return
  errorMensaje.value = ''
  try {
    await dbService.extractSongsFromExternalApi(
      [track],
      plataformaApiPlaylist.value,
      playlistActual.value.id
    )
    await cargarDatos()
    mensaje.value = `"${track.titulo}" agregada a "${playlistActual.value.nombre}".`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function abrirModalNuevaPlaylist() {
  limpiarFormulario()
  mostrarModal.value = true
}

function abrirModalImportarApi() {
  mostrarModalApi.value = true
}

async function importarPlaylistExterna(plTemplate) {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const creada = await dbService.extractPlaylistFromApi(plTemplate)
    mostrarModalApi.value = false
    await cargarDatos()
    mensaje.value = `Playlist "${creada.nombre}" importada con ${plTemplate.canciones.length} canciones.`
    router.push({ path: '/playlists', query: { id: creada.id } })
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function cerrarModal() {
  mostrarModal.value = false
  limpiarFormulario()
}

async function guardarPlaylist() {
  errorMensaje.value = ''
  mensaje.value = ''
  cargando.value = true

  try {
    const payload = {
      nombre: nombre.value,
      descripcion: descripcion.value,
      es_publica: esPublica.value
    }

    if (editandoId.value) {
      await dbService.updatePlaylist(editandoId.value, payload)
      mensaje.value = `Playlist "${nombre.value}" actualizada.`
      cerrarModal()
      await cargarDatos()
    } else {
      const nueva = await dbService.createPlaylist(payload)
      mensaje.value = `Playlist "${nombre.value}" creada.`
      cerrarModal()
      await cargarDatos()
      router.push({ path: '/playlists', query: { id: nueva.id } })
    }
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    cargando.value = false
  }
}

function editarPlaylist(pl) {
  editandoId.value = pl.id
  nombre.value = pl.nombre
  descripcion.value = pl.descripcion || ''
  esPublica.value = pl.es_publica ?? false
  mostrarModal.value = true
}

async function confirmarEliminacionPlaylist() {
  if (!playlistPorEliminar.value) return
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const idEliminado = playlistPorEliminar.value.id
    const nombreEliminado = playlistPorEliminar.value.nombre
    await dbService.deletePlaylist(idEliminado)
    playlistPorEliminar.value = null
    if (route.query.id === idEliminado) {
      router.push({ path: '/playlists' })
    }
    await cargarDatos()
    mensaje.value = `Playlist "${nombreEliminado}" eliminada.`
  } catch (err) {
    errorMensaje.value = err.message
    playlistPorEliminar.value = null
  }
}

function limpiarFormulario() {
  nombre.value = ''
  descripcion.value = ''
  esPublica.value = false
  editandoId.value = null
}

function obtenerIniciales(texto) {
  if (!texto) return 'G'
  return texto
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatearDuracion(seg) {
  const s = Number(seg) || 0
  const min = Math.floor(s / 60)
  const rem = String(s % 60).padStart(2, '0')
  return `${min}:${rem}`
}

function formatearDuracionTotal(totalSeg) {
  const s = Number(totalSeg) || 0
  if (s <= 0) return '0 min'
  const horas = Math.floor(s / 3600)
  const mins = Math.max(1, Math.round((s % 3600) / 60))
  if (horas > 0) {
    return `${horas} h ${mins} min`
  }
  return `${mins} min`
}

function formatearFechaCorta(iso) {
  if (!iso) return 'Reciente'
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return 'Reciente'
  }
}

function etiquetaPlataforma(plat) {
  const map = {
    spotify: 'Spotify',
    youtube_music: 'YT Music',
    youtube: 'YouTube',
    gavify: 'Gavify'
  }
  return map[plat] || 'Gavify'
}

watch(
  () => route.query.id,
  newId => {
    ignoradasTemporalmente.value = new Set()
    if (newId) {
      cargarCancionesDePlaylistActiva(newId)
    } else {
      cancionesEnPlaylist.value = []
    }
  }
)

watch(
  () => route.query.action,
  newAction => {
    if (newAction === 'new' && auth.canManagePlaylists.value) {
      abrirModalNuevaPlaylist()
      router.replace({ path: '/playlists', query: { ...route.query, action: undefined } })
    }
  },
  { immediate: true }
)

watch(
  () => [auth.currentUser.value?.id, auth.currentUser.value?.organizacion_id],
  () => {
    cargarDatos()
  }
)

onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
.playlists-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 40px;
}

/* Alertas redondeadas */
.alert-box {
  padding: 13px 18px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-text {
  flex: 1;
}

.alert-close {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.alert-success {
  background: rgba(184, 223, 109, 0.14);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.alert-error {
  background: rgba(232, 121, 93, 0.14);
  border: 1px solid var(--red);
  color: var(--red);
}

/* ========================================================================= */
/* VISTA TODAS LAS PLAYLISTS (CUADRADOS 4 POR FILA ADAPTABLES)               */
/* ========================================================================= */
.all-playlists-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.library-top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.library-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.lib-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--cream);
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
}

.lib-filter-pill:hover {
  background: rgba(255, 255, 255, 0.13);
}

.lib-filter-pill.active {
  background: var(--cream);
  color: #0b0d0b;
  border-color: var(--cream);
}

.library-right-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lib-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #161916;
  border: 1px solid #2a3029;
  padding: 8px 16px;
  border-radius: 999px;
  color: #969e95;
}

.lib-search-box input {
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 13px;
  outline: none;
  width: 180px;
}

.lib-sort-dropdown {
  background: #161916;
  border: 1px solid #2a3029;
  color: var(--cream);
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.lib-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.outline-accent {
  background: rgba(184, 223, 109, 0.08);
  border: 1px solid rgba(184, 223, 109, 0.45);
  color: var(--lime);
}

.primary-lime {
  background: var(--lime);
  color: #10130f;
  border: 0;
}

/* GRID DE 4 POR FILA EN ESCRITORIO Y RESPONSIVE SEGÚN RESOLUCIÓN */
.square-playlists-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 1320px) {
  .square-playlists-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .square-playlists-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
}

@media (max-width: 540px) {
  .square-playlists-grid {
    grid-template-columns: 1fr;
  }
}

.square-playlist-card {
  background: #151915;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 15px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.square-playlist-card:hover {
  background: #1e241e;
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-4px);
}

.square-artwork-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  background: #202620;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.square-single-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.square-collage-2x2 {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.square-collage-2x2 img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.square-fallback-art {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #232c22, #141814);
  color: var(--lime);
}

.card-dup-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(15, 18, 15, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(184, 223, 109, 0.55);
  color: var(--lime);
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
}

.hover-play-fab {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1ed760;
  color: #0b0d0b;
  border: 0;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.square-playlist-card:hover .hover-play-fab {
  opacity: 1;
  transform: translateY(0);
}

.hover-play-fab:hover {
  transform: scale(1.06) !important;
  background: #3be477;
}

.square-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.square-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.square-card-sub {
  margin: 0;
  font-size: 12px;
  color: #9aa099;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========================================================================= */
/* VISTA DETALLE DE PLAYLIST INDIVIDUAL (ESTILO SPOTIFY / YOUTUBE MUSIC)     */
/* ========================================================================= */
.playlist-detail-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-nav-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--cream);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.back-pill:hover {
  background: rgba(255, 255, 255, 0.14);
}

.org-tag {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.playlist-hero {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 28px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(44, 72, 115, 0.52) 0%, rgba(18, 22, 18, 0.92) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-cover-box {
  width: 210px;
  height: 210px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  background: #1a201a;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
  cursor: pointer;
}

.hero-single-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-collage-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.hero-collage-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-empty-cover {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--lime);
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.hero-type-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.visibility-label {
  font-size: 13px;
  font-weight: 600;
  color: #e6ebe5;
}

.platform-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.dup-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(184, 223, 109, 0.18);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.hero-title {
  margin: 0;
  font-size: clamp(32px, 4.5vw, 56px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.06;
  color: #ffffff;
}

.hero-desc {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  max-width: 680px;
}

.hero-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}

.creator-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--lime);
  color: #10130f;
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.creator-name {
  color: #ffffff;
}

.meta-duration {
  color: rgba(255, 255, 255, 0.68);
}

/* Barra de acciones de la Playlist */
.playlist-controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 6px 4px;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.big-play-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1ed760;
  color: #090b09;
  border: 0;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(30, 215, 96, 0.3);
  transition: transform 0.15s ease, background 0.15s ease;
}

.big-play-btn:hover:not(:disabled) {
  transform: scale(1.06);
  background: #3be477;
}

.big-play-btn:disabled {
  opacity: 0.4;
}

.icon-circle-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--cream);
  display: grid;
  place-items: center;
}

.icon-circle-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.action-pills-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.action-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.15s ease;
}

.action-pill:hover {
  background: rgba(255, 255, 255, 0.15);
}

.action-pill.active {
  background: var(--lime);
  color: #0e110e;
  border-color: var(--lime);
}

.pill-repeated {
  border-color: rgba(184, 223, 109, 0.45);
}

.pill-counter {
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.pill-danger:hover {
  background: rgba(232, 121, 93, 0.2);
  border-color: var(--red);
  color: var(--red);
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.inline-track-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #151815;
  border: 1px solid #282e27;
  padding: 8px 14px;
  border-radius: 999px;
  color: #939b92;
}

.inline-track-search input {
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 12px;
  outline: none;
  width: 165px;
}

.track-sort-select {
  background: #151815;
  border: 1px solid #282e27;
  color: var(--cream);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

/* Paneles Integrados (Canciones Repetidas / Agregar Canciones) */
.integrated-panel {
  background: #151915;
  border: 1px solid #2b332a;
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.repeated-panel {
  border-color: rgba(184, 223, 109, 0.45);
}

.integrated-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.integrated-panel-head h3 {
  margin: 4px 0;
  font-size: 20px;
}

.repeated-actions-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rep-clean-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(184, 223, 109, 0.1);
  border: 1px solid rgba(184, 223, 109, 0.35);
  color: var(--lime);
}

.rep-clean-banner small {
  display: block;
  color: var(--cream);
  margin-top: 2px;
}

.rep-items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.rep-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #101310;
  border: 1px solid #252c24;
  border-radius: 14px;
  flex-wrap: wrap;
}

.rep-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rep-thumb {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  object-fit: cover;
}

.rep-thumb-empty {
  display: grid;
  place-items: center;
  background: #232922;
  color: var(--lime);
}

.rep-item-info strong {
  display: block;
  font-size: 13px;
}

.rep-item-info small {
  color: var(--muted);
  font-size: 11px;
}

.already-in-tag {
  color: var(--lime);
  font-weight: 700;
}

.rep-item-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-same-list {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(232, 121, 93, 0.16);
  border: 1px solid var(--red);
  color: #ff9c84;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.rep-decision-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Panel Agregar Canciones */
.add-tabs-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.catalog-picker,
.api-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.api-quick-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.instant-search-input-wrap {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #101310;
  border: 1px solid #2a3129;
  padding: 10px 16px;
  border-radius: 999px;
  color: #939b92;
}

.search-input-clean {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 13px;
  outline: none;
}

.searching-badge {
  font-size: 11px;
  color: var(--lime);
  font-weight: 600;
}

.catalog-picker-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.catalog-picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  background: #101310;
  border: 1px solid #242b23;
  border-radius: 14px;
}

.picker-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.picker-track-text-wrap {
  min-width: 0;
  max-width: 280px;
  display: flex;
  flex-direction: column;
}

.picker-track-title-wrap,
.picker-track-artist-wrap {
  min-width: 0;
  max-width: 100%;
}

.picker-track-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.picker-track-artist {
  font-size: 11px;
  color: var(--muted);
}

.picker-track-sub {
  color: var(--muted);
  font-size: 11px;
}

.track-name-marquee-wrap {
  min-width: 0;
  max-width: 320px;
}

.track-artist-marquee-wrap {
  min-width: 0;
  max-width: 240px;
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-circle-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  display: grid;
  place-items: center;
}

.icon-circle-sm:hover {
  background: #1ed760;
  color: #0b0d0b;
  border-color: #1ed760;
}

.icon-add-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--lime);
  border: 0;
  color: #111912;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
  box-shadow: 0 4px 10px rgba(184, 223, 109, 0.25);
}

.icon-add-circle:hover {
  background: #c9ec84;
  transform: scale(1.08);
}

.action-pill-plus {
  width: 38px;
  height: 38px;
  padding: 0 !important;
  justify-content: center;
  border-radius: 50% !important;
}

/* Tabla de canciones estilo Spotify */
.tracklist-container {
  margin-top: 4px;
  background: rgba(20, 24, 20, 0.5);
  border-radius: 18px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.spotify-track-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.spotify-track-table thead th {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #9ca39b;
  font-size: 12px;
  font-weight: 600;
}

.col-num {
  width: 46px;
  text-align: center;
}

.col-album {
  width: 26%;
}

.col-date {
  width: 18%;
}

.col-duration {
  width: 70px;
  text-align: right;
}

.col-actions {
  width: 48px;
  text-align: right;
}

.track-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.12s ease;
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.07);
}

.track-row.is-playing {
  background: rgba(30, 215, 96, 0.12);
}

.track-row.is-repeated-row {
  background: rgba(232, 121, 93, 0.06);
}

.track-row td {
  padding: 10px 12px;
  vertical-align: middle;
  font-size: 13px;
  color: #b3b9b2;
}

.row-play-trigger {
  background: transparent;
  border: 0;
  color: #9ca39b;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
}

.play-icon-hover {
  display: none;
  color: #ffffff;
}

.track-row:hover .num-text {
  display: none;
}

.track-row:hover .play-icon-hover {
  display: inline-flex;
}

.track-main-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.track-cover-sm {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.track-cover-fallback {
  display: grid;
  place-items: center;
  background: #232922;
  color: var(--lime);
}

.track-title-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.track-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.track-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.track-row.is-playing .track-name {
  color: #1ed760;
}

.inline-dup-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.inline-dup-pill.same-list {
  background: rgba(232, 121, 93, 0.18);
  border: 1px solid var(--red);
  color: #ff9c84;
}

.track-artist-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca39b;
}

.platform-mini-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #d5dbd4;
}

.row-remove-btn {
  background: transparent;
  border: 0;
  color: #889087;
  opacity: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
}

.track-row:hover .row-remove-btn {
  opacity: 1;
}

.row-remove-btn:hover {
  color: var(--red);
  background: rgba(232, 121, 93, 0.14);
}

.empty-tracks-box,
.empty-library-box {
  padding: 40px 24px;
  text-align: center;
  background: #141714;
  border: 1px dashed #2c332b;
  border-radius: 18px;
  color: var(--muted);
}

/* Modales */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: #181b18;
  border: 1px solid var(--line);
  border-radius: 20px;
}

.modal-large {
  max-width: 760px;
}

.import-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.import-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #121512;
  border: 1px solid #2a3129;
  border-radius: 14px;
}

.import-card h4 {
  margin: 4px 0;
  font-size: 15px;
}

.import-card p {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--muted);
}

.import-card small {
  color: var(--lime);
  font-size: 11px;
}

.playlist-form {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}

.form-group input,
.form-group textarea {
  background: #121512;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 12px 15px;
  font-size: 13px;
  border-radius: 12px;
}

.visibility-switch-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: #121512;
  border: 1px solid #2a3229;
  border-radius: 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.visibility-switch-box:hover {
  border-color: rgba(184, 223, 109, 0.45);
}

.visibility-switch-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.visibility-switch-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #889287;
  text-transform: uppercase;
}

.visibility-switch-state {
  font-size: 14px;
  color: #e6ebe4;
}

.visibility-switch-state.public {
  color: var(--lime);
}

.visibility-switch-desc {
  font-size: 11px;
  color: #8d968b;
}

.switch-pill-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.switch-side-label {
  font-size: 12px;
  font-weight: 600;
  color: #6d756b;
  transition: color 0.2s ease;
}

.switch-side-label.active {
  color: #eff4ed;
}

.modern-toggle-switch {
  position: relative;
  width: 50px;
  height: 28px;
  border-radius: 999px;
  background: #252c24;
  border: 1px solid #384237;
  padding: 3px;
  cursor: pointer;
  transition: background 0.22s ease, border-color 0.22s ease;
  display: inline-flex;
  align-items: center;
}

.modern-toggle-switch.is-on {
  background: rgba(184, 223, 109, 0.25);
  border-color: var(--lime);
}

.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #9aa398;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

.modern-toggle-switch.is-on .switch-thumb {
  transform: translateX(22px);
  background: var(--lime);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  border-radius: 999px;
}

.btn-xs {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 11px;
  border-radius: 999px;
}

.danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(232, 121, 93, 0.16);
  border: 1px solid var(--red);
  color: var(--red);
  padding: 9px 16px;
  border-radius: 999px;
  font-weight: 700;
}

@media (max-width: 780px) {
  .playlist-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-cover-box {
    width: 160px;
    height: 160px;
  }

  .col-album,
  .col-date {
    display: none;
  }
}
</style>
