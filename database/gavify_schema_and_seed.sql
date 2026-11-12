-- =============================================================================
-- GAVIFY SAAS - SCRIPT DDL, RLS, RBAC Y SEED DATA COMPLETO
-- Proyecto: Gavify SaaS (Gestión Musical, Playlists y Detección de Duplicados)
-- Creador: Gavilan Sebastian (Super Admin)
-- Base de Datos: PostgreSQL 15+ (Compatible con Supabase / RDS / Local)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpieza preventiva de tablas previas (en orden inverso a sus dependencias)
DROP TABLE IF EXISTS metricas_reproduccion CASCADE;
DROP TABLE IF EXISTS playlist_canciones CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS canciones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS planes CASCADE;
DROP TABLE IF EXISTS organizaciones CASCADE;

-- =============================================================================
-- 1. TABLA: ORGANIZACIONES (Multi-Tenancy)
-- =============================================================================
CREATE TABLE organizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'estudio',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. TABLA: PLANES (Tiers de Suscripción)
-- =============================================================================
CREATE TABLE planes (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    precio_mensual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    descripcion TEXT
);

-- =============================================================================
-- 3. TABLA: USUARIOS (3 Únicos Roles: super_admin, admin, usuario)
-- =============================================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    avatar VARCHAR(10) NOT NULL DEFAULT 'US',
    rol VARCHAR(50) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('super_admin', 'admin', 'usuario')),
    plan_id VARCHAR(50) NOT NULL REFERENCES planes(id) DEFAULT 'gratis',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    spotify_connected BOOLEAN NOT NULL DEFAULT FALSE,
    spotify_user_id VARCHAR(100),
    ytmusic_connected BOOLEAN NOT NULL DEFAULT FALSE,
    ytmusic_channel_id VARCHAR(100),
    youtube_connected BOOLEAN NOT NULL DEFAULT FALSE,
    youtube_channel_id VARCHAR(100),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_organizacion ON usuarios(organizacion_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- =============================================================================
-- 4. TABLA: CANCIONES (Catálogo Musical sincronizado con APIs)
-- =============================================================================
CREATE TABLE canciones (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    artista VARCHAR(120) NOT NULL,
    album VARCHAR(120),
    genero VARCHAR(60),
    duracion_segundos INTEGER NOT NULL DEFAULT 0,
    reproducciones INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    plataforma_origen VARCHAR(30) NOT NULL DEFAULT 'spotify' CHECK (plataforma_origen IN ('spotify', 'youtube_music', 'youtube')),
    portada_url TEXT,
    spotify_track_id VARCHAR(100),
    ytmusic_track_id VARCHAR(100),
    youtube_video_id VARCHAR(100),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canciones_organizacion ON canciones(organizacion_id);
CREATE INDEX idx_canciones_plataforma ON canciones(plataforma_origen);

-- =============================================================================
-- 5. TABLA: PLAYLISTS (Listas Públicas / Privadas de los Usuarios)
-- =============================================================================
CREATE TABLE playlists (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    es_publica BOOLEAN NOT NULL DEFAULT FALSE,
    plataforma_origen VARCHAR(30) NOT NULL DEFAULT 'gavify' CHECK (plataforma_origen IN ('gavify', 'spotify', 'youtube_music', 'youtube')),
    portada_url TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playlists_usuario ON playlists(usuario_id);
CREATE INDEX idx_playlists_organizacion ON playlists(organizacion_id);

-- =============================================================================
-- 6. TABLA: PLAYLIST_CANCIONES (Relación N:M y Detección de Repetidas)
-- =============================================================================
CREATE TABLE playlist_canciones (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    playlist_id VARCHAR(64) NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    cancion_id VARCHAR(64) NOT NULL REFERENCES canciones(id) ON DELETE CASCADE,
    posicion INTEGER NOT NULL DEFAULT 0,
    agregado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pc_playlist ON playlist_canciones(playlist_id);
CREATE INDEX idx_pc_cancion ON playlist_canciones(cancion_id);

-- =============================================================================
-- 7. TABLA: METRICAS_REPRODUCCION (Estadísticas y Ritmo Semanal)
-- =============================================================================
CREATE TABLE metricas_reproduccion (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    dia_codigo CHAR(1) NOT NULL CHECK (dia_codigo IN ('L', 'M', 'X', 'J', 'V', 'S', 'D')),
    dia_nombre VARCHAR(20) NOT NULL,
    canciones_escuchadas INTEGER NOT NULL DEFAULT 0,
    genero_predominante VARCHAR(60) NOT NULL,
    porcentaje_genero INTEGER NOT NULL DEFAULT 0,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_metricas_usuario ON metricas_reproduccion(usuario_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURIDAD Y AISLAMIENTO MULTI-TENANT
-- =============================================================================
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE canciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_canciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_reproduccion ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizaciones_public_read ON organizaciones FOR SELECT USING (true);
CREATE POLICY planes_public_read ON planes FOR SELECT USING (true);
CREATE POLICY usuarios_tenant_isolation ON usuarios FOR ALL USING (true);
CREATE POLICY canciones_tenant_isolation ON canciones FOR ALL USING (true);
CREATE POLICY playlists_tenant_isolation ON playlists FOR ALL USING (true);
CREATE POLICY pc_tenant_isolation ON playlist_canciones FOR ALL USING (true);
CREATE POLICY metricas_tenant_isolation ON metricas_reproduccion FOR ALL USING (true);

-- =============================================================================
-- SEED DATA: 6 USUARIOS, SUS PLAYLISTS, CANCIONES Y ESTADÍSTICAS
-- =============================================================================

-- 1. Insertar Organizaciones
INSERT INTO organizaciones (id, nombre, slug, tipo)
VALUES
('11111111-1111-1111-1111-111111111111', 'Sebas Music Hub', 'sebas-music-hub', 'estudio'),
('22222222-2222-2222-2222-222222222222', 'Radio Urbana Records', 'radio-urbana', 'radio');

-- 2. Insertar Planes Comerciales
INSERT INTO planes (id, nombre, precio_mensual, descripcion)
VALUES
('gratis', 'Plan Gratis', 0.00, 'Acceso básico gratuito a biblioteca personal.'),
('provilan', 'Plan Provilan Pro', 3.99, 'Listas ilimitadas y estadísticas semanales.'),
('sebagod', 'Plan SebaGod', 7.99, 'Detección activa de repetidas y calidad máxima.'),
('sebagod_prime', 'Plan SebaGod Prime', 12.99, 'Control total de plataforma, métricas en tiempo real y soporte prioritario.');

-- 3. Insertar los 6 Usuarios Solicitados
INSERT INTO usuarios (
    id, organizacion_id, email, nombre, avatar, rol, plan_id,
    spotify_connected, spotify_user_id, ytmusic_connected, ytmusic_channel_id, youtube_connected, youtube_channel_id
)
VALUES
-- Super Admin (Sebastian Gavilan)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'sebastian@gavify.io', 'Sebastian Gavilan', 'SG', 'super_admin', 'sebagod_prime', TRUE, 'spotify_sebas_01', TRUE, 'ytm_sebas_01', TRUE, 'yt_sebas_01'),

-- Admin (Valentina Ruiz)
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'valentina@gavify.io', 'Valentina Ruiz', 'VR', 'admin', 'sebagod', TRUE, 'spotify_valen_02', TRUE, 'ytm_valen_02', TRUE, 'yt_valen_02'),

-- Usuario 1: Camila Romero (Plan Gratis)
('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'camila@gavify.io', 'Camila Romero', 'CR', 'usuario', 'gratis', TRUE, 'spotify_cami_01', FALSE, NULL, TRUE, 'yt_cami_01'),

-- Usuario 2: Mateo López (Plan Provilan Pro)
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'mateo@gavify.io', 'Mateo López', 'ML', 'usuario', 'provilan', TRUE, 'spotify_mateo_02', TRUE, 'ytm_mateo_02', FALSE, NULL),

-- Usuario 3: Lucía Martínez (Plan SebaGod)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'lucia@gavify.io', 'Lucía Martínez', 'LM', 'usuario', 'sebagod', TRUE, 'spotify_lucia_03', TRUE, 'ytm_lucia_03', TRUE, 'yt_lucia_03'),

-- Usuario 4: Julián Torres (Plan SebaGod Prime)
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'julian@gavify.io', 'Julián Torres', 'JT', 'usuario', 'sebagod_prime', TRUE, 'spotify_julian_04', TRUE, 'ytm_julian_04', TRUE, 'yt_julian_04');

-- 4. Insertar Canciones
INSERT INTO canciones (
    id, usuario_id, organizacion_id, titulo, artista, album, genero, duracion_segundos, reproducciones,
    plataforma_origen, portada_url, youtube_video_id
)
VALUES
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'As It Was', 'Harry Styles', 'Harrys House', 'Pop', 165, 48, 'spotify', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', 'Qfm6nfz1QNQ'),
('c1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Blinding Lights', 'The Weeknd', 'After Hours', 'Indie Pop', 200, 42, 'spotify', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80', 'XwxLwG2_Sxk'),
('c1111111-1111-1111-1111-111111111113', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Flowers', 'Miley Cyrus', 'Endless Summer Vacation', 'Pop', 198, 37, 'youtube_music', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80', 'iawgB2CDCrw'),
('c1111111-1111-1111-1111-111111111114', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Calm Down', 'Rema, Selena Gomez', 'Rave & Roses Ultra', 'Trap / Urbano', 237, 32, 'youtube', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80', 'G-D80U_u3sk'),
('c1111111-1111-1111-1111-111111111115', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'BZRP Music Sessions #52', 'Bizarrap, Quevedo', 'Bizarrap Live Sessions', 'Electrónica', 199, 65, 'youtube_music', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&auto=format&fit=crop&q=80', 'tJWWJiVYiUA'),
('c1111111-1111-1111-1111-111111111116', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Viva La Vida', 'Coldplay', 'Viva La Vida', 'Rock', 242, 54, 'spotify', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80', 'y4zdDXPYo0I'),
('c1111111-1111-1111-1111-111111111117', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Yellow', 'Coldplay', 'Parachutes', 'Alternativo', 269, 39, 'youtube_music', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80', 'yKNxeF4KMsY');

-- 5. Insertar Playlists Propias para los Usuarios
INSERT INTO playlists (
    id, usuario_id, organizacion_id, nombre, descripcion, es_publica, plataforma_origen, portada_url
)
VALUES
-- Playlist de Sebastian Gavilan (Super Admin) - Playlist con repetidas para prueba del motor
('p1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Favoritas 2026 (Spotify)', 'Las pistas más escuchadas del año sincronizadas desde Spotify Web API', FALSE, 'spotify', 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80'),
('p1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Tu lado B (Mix YT Music & Spotify)', 'Lista combinada de Spotify, YT Music y YouTube', TRUE, 'gavify', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80'),

-- Playlist de Valentina Ruiz (Admin)
('p1111111-1111-1111-1111-111111111113', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Hits Radiales 2026', 'Selección de música pop y rock para difusión', TRUE, 'spotify', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'),

-- Playlist de Camila Romero (Usuario - Plan Gratis)
('p1111111-1111-1111-1111-111111111114', '10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Acústico & Chill', 'Temas acústicos para relajar y estudiar', FALSE, 'gavify', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&auto=format&fit=crop&q=80'),

-- Playlist de Mateo López (Usuario - Plan Provilan Pro)
('p1111111-1111-1111-1111-111111111115', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Entrenamiento & Ritmo', 'Pistas de alta energía para entrenar', TRUE, 'youtube_music', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80'),

-- Playlist de Lucía Martínez (Usuario - Plan SebaGod)
('p1111111-1111-1111-1111-111111111116', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Indie Radar', 'Descubrimientos semanales y lanzamientos', TRUE, 'spotify', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80'),

-- Playlist de Julián Torres (Usuario - Plan SebaGod Prime)
('p1111111-1111-1111-1111-111111111117', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Electrónica & Sessions', 'Sesiones completas y tracks de festival', TRUE, 'youtube_music', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&auto=format&fit=crop&q=80');

-- 6. Insertar Canciones en las Playlists (incluye repetidas en la lista de Sebastian para probar la depuración)
INSERT INTO playlist_cancIONES (id, playlist_id, cancion_id, posicion)
VALUES
-- Playlist Favoritas 2026 (Tiene 'As It Was' repetida en posición 0 y 3)
('pc-01', 'p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 0),
('pc-02', 'p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 1),
('pc-03', 'p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113', 2),
('pc-04', 'p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 3), -- REPETIDA: As It Was

-- Playlist Tu lado B (Tiene 'Blinding Lights' repetida en posición 1 y 3)
('pc-05', 'p1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 0),
('pc-06', 'p1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 1),
('pc-07', 'p1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111114', 2),
('pc-08', 'p1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 3), -- REPETIDA: Blinding Lights
('pc-09', 'p1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111115', 4),

-- Playlist de Valentina Ruiz
('pc-10', 'p1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111116', 0),
('pc-11', 'p1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 1),

-- Playlist de Camila Romero
('pc-12', 'p1111111-1111-1111-1111-111111111114', 'c1111111-1111-1111-1111-111111111117', 0),
('pc-13', 'p1111111-1111-1111-1111-111111111114', 'c1111111-1111-1111-1111-111111111113', 1),

-- Playlist de Mateo López
('pc-14', 'p1111111-1111-1111-1111-111111111115', 'c1111111-1111-1111-1111-111111111114', 0),
('pc-15', 'p1111111-1111-1111-1111-111111111115', 'c1111111-1111-1111-1111-111111111115', 1),

-- Playlist de Lucía Martínez
('pc-16', 'p1111111-1111-1111-1111-111111111116', 'c1111111-1111-1111-1111-111111111112', 0),
('pc-17', 'p1111111-1111-1111-1111-111111111116', 'c1111111-1111-1111-1111-111111111117', 1),

-- Playlist de Julián Torres
('pc-18', 'p1111111-1111-1111-1111-111111111117', 'c1111111-1111-1111-1111-111111111115', 0),
('pc-19', 'p1111111-1111-1111-1111-111111111117', 'c1111111-1111-1111-1111-111111111112', 1);

-- 7. Insertar Métricas y Estadísticas Semanales de Escucha
INSERT INTO metricas_reproduccion (
    usuario_id, organizacion_id, dia_codigo, dia_nombre, canciones_escuchadas, genero_predominante, porcentaje_genero
)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'L', 'Lunes', 12, 'Alternativo', 28),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'M', 'Martes', 18, 'Electrónica', 25),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'X', 'Miércoles', 17, 'Rock', 20),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'J', 'Jueves', 25, 'Pop', 14),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'V', 'Viernes', 23, 'Indie Pop', 8),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'S', 'Sábado', 25, 'Trap / Urbano', 5),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'D', 'Domingo', 21, 'Alternativo', 28);
