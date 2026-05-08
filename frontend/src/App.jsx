import { useCallback, useEffect, useMemo, useState } from "react";

const GENEROS = [
  { value: "ficcion", label: "Ficción" },
  { value: "no_ficcion", label: "No ficción" },
  { value: "poesia", label: "Poesía" },
  { value: "ensayo", label: "Ensayo" },
  { value: "infantil", label: "Infantil" },
  { value: "otro", label: "Otro" },
];

const etiquetaGenero = (valor) => GENEROS.find((g) => g.value === valor)?.label ?? valor;

function apiBase() {
  const base = import.meta.env.VITE_API_URL ?? "";
  return base.replace(/\/$/, "");
}

function validarTituloAutor(valor, etiqueta) {
  const v = (valor ?? "").trim();
  if (!v) return `${etiqueta} es obligatorio.`;
  if (v.length > 200) return `${etiqueta} admite como máximo 200 caracteres.`;
  if (/<\/?[A-Za-z][^>]*>|&#?\w+;|<!ENTITY|<!\[CDATA\[|\]\]>/.test(v)) {
    return `${etiqueta} no puede contener construcciones tipo XML o entidades.`;
  }
  return null;
}

function validarAnio(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n)) return "El año debe ser un número entero.";
  if (n < 1000 || n > 2100) return "El año debe estar entre 1000 y 2100.";
  return null;
}

function validarGenero(valor) {
  const ok = GENEROS.some((g) => g.value === valor);
  return ok ? null : "Seleccione un género válido.";
}

async function parsearError(respuesta) {
  try {
    const data = await respuesta.json();
    if (typeof data === "object" && data) {
      const partes = [];
      for (const k of Object.keys(data)) {
        const v = data[k];
        if (Array.isArray(v)) partes.push(`${k}: ${v.join(", ")}`);
        else if (typeof v === "string") partes.push(`${k}: ${v}`);
      }
      if (partes.length) return partes.join(" ");
      if (typeof data.detail === "string") return data.detail;
    }
  } catch {
    /* ignorar */
  }
  return `Error HTTP ${respuesta.status}`;
}

export default function App() {
  const [elementos, setElementos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeTipo, setMensajeTipo] = useState("info");

  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [anio, setAnio] = useState("");
  const [genero, setGenero] = useState(GENEROS[0].value);

  const [editandoId, setEditandoId] = useState(null);
  const [erroresLocales, setErroresLocales] = useState({});

  const [modalBorrar, setModalBorrar] = useState(null);

  const raiz = useMemo(() => apiBase(), []);

  const avisar = useCallback((texto, tipo = "info") => {
    setMensajeTipo(tipo);
    setMensaje(texto);
    window.clearTimeout(avisar._t);
    avisar._t = window.setTimeout(() => setMensaje(null), 6000);
  }, []);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const res = await fetch(`${raiz}/api/libros/`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(await parsearError(res));
      const data = await res.json();
      setElementos(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      avisar(String(e.message || e), "error");
    } finally {
      setCargandoLista(false);
    }
  }, [avisar, raiz]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  const reiniciarFormulario = () => {
    setTitulo("");
    setAutor("");
    setAnio("");
    setGenero(GENEROS[0].value);
    setEditandoId(null);
    setErroresLocales({});
  };

  const validarFormularioLocal = () => {
    const e = {};
    const et = validarTituloAutor(titulo, "El título");
    const ea = validarTituloAutor(autor, "El autor");
    const ey = validarAnio(anio);
    const eg = validarGenero(genero);
    if (et) e.titulo = et;
    if (ea) e.autor = ea;
    if (ey) e.anio = ey;
    if (eg) e.genero = eg;
    setErroresLocales(e);
    return Object.keys(e).length === 0;
  };

  const enviarCrear = async (evento) => {
    evento.preventDefault();
    if (!validarFormularioLocal()) {
      avisar("Revise los campos marcados antes de continuar.", "error");
      return;
    }
    const claveIdempotencia = crypto.randomUUID().replace(/-/g, "");
    setGuardando(true);
    try {
      const cuerpo = {
        titulo: titulo.trim(),
        autor: autor.trim(),
        anio: Number(anio),
        genero,
      };
      const res = await fetch(`${raiz}/api/libros/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": claveIdempotencia,
        },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) throw new Error(await parsearError(res));
      avisar("Registro creado correctamente.", "ok");
      reiniciarFormulario();
      await cargarLista();
    } catch (e) {
      avisar(String(e.message || e), "error");
    } finally {
      setGuardando(false);
    }
  };

  const enviarEditar = async (evento) => {
    evento.preventDefault();
    if (editandoId == null) return;
    if (!validarFormularioLocal()) {
      avisar("Revise los campos marcados antes de continuar.", "error");
      return;
    }
    setGuardando(true);
    try {
      const cuerpo = {
        titulo: titulo.trim(),
        autor: autor.trim(),
        anio: Number(anio),
        genero,
      };
      const res = await fetch(`${raiz}/api/libros/${editandoId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) throw new Error(await parsearError(res));
      avisar("Cambios guardados.", "ok");
      reiniciarFormulario();
      await cargarLista();
    } catch (e) {
      avisar(String(e.message || e), "error");
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (item) => {
    setEditandoId(item.id);
    setTitulo(item.titulo ?? "");
    setAutor(item.autor ?? "");
    setAnio(String(item.anio ?? ""));
    setGenero(item.genero ?? GENEROS[0].value);
    setErroresLocales({});
    avisar(`Editando el libro con identificador ${item.id}.`, "info");
    window.requestAnimationFrame(() => {
      document.getElementById("campo-titulo")?.focus();
    });
  };

  const confirmarBorrado = async () => {
    if (!modalBorrar) return;
    setGuardando(true);
    try {
      const res = await fetch(`${raiz}/api/libros/${modalBorrar.id}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok && res.status !== 204) throw new Error(await parsearError(res));
      avisar("Registro eliminado.", "ok");
      setModalBorrar(null);
      if (editandoId === modalBorrar.id) reiniciarFormulario();
      await cargarLista();
    } catch (e) {
      avisar(String(e.message || e), "error");
    } finally {
      setGuardando(false);
    }
  };

  const tituloFormulario = editandoId == null ? "Registrar libro" : `Editar libro #${editandoId}`;

  return (
    <div className="layout">
      <a className="salto-contenido" href="#contenido-principal">
        Ir al contenido principal
      </a>

      <header className="cabecera" role="banner">
        <div className="cabecera-inner">
          <h1 className="titulo-sitio">Biblioteca CRUD</h1>
          <p className="subtitulo">
            Administración de libros.
          </p>
        </div>
      </header>

      <main id="contenido-principal" className="principal" role="main">
        <section className="panel panel-formulario" aria-labelledby="titulo-formulario">
          <h2 id="titulo-formulario" className="panel-titulo">
            {tituloFormulario}
          </h2>

          <form
            className="formulario"
            onSubmit={editandoId == null ? enviarCrear : enviarEditar}
            noValidate
            aria-busy={guardando}
          >
            <div className="rejilla-campos">
              <div className="campo">
                <label htmlFor="campo-titulo">
                  Título <span className="requerido">(obligatorio)</span>
                </label>
                <input
                  id="campo-titulo"
                  type="text"
                  autoComplete="off"
                  maxLength={200}
                  value={titulo}
                  onChange={(ev) => setTitulo(ev.target.value)}
                  aria-invalid={Boolean(erroresLocales.titulo)}
                  aria-describedby={erroresLocales.titulo ? "err-titulo" : undefined}
                />
                {erroresLocales.titulo ? (
                  <p id="err-titulo" className="error-campo" role="alert">
                    {erroresLocales.titulo}
                  </p>
                ) : null}
              </div>

              <div className="campo">
                <label htmlFor="campo-autor">
                  Autor <span className="requerido">(obligatorio)</span>
                </label>
                <input
                  id="campo-autor"
                  type="text"
                  autoComplete="name"
                  maxLength={200}
                  value={autor}
                  onChange={(ev) => setAutor(ev.target.value)}
                  aria-invalid={Boolean(erroresLocales.autor)}
                  aria-describedby={erroresLocales.autor ? "err-autor" : undefined}
                />
                {erroresLocales.autor ? (
                  <p id="err-autor" className="error-campo" role="alert">
                    {erroresLocales.autor}
                  </p>
                ) : null}
              </div>

              <div className="campo">
                <label htmlFor="campo-anio">
                  Año <span className="requerido">(obligatorio)</span>
                </label>
                <input
                  id="campo-anio"
                  type="number"
                  inputMode="numeric"
                  min={1000}
                  max={2100}
                  step={1}
                  value={anio}
                  onChange={(ev) => setAnio(ev.target.value)}
                  aria-invalid={Boolean(erroresLocales.anio)}
                  aria-describedby={erroresLocales.anio ? "err-anio ayuda-anio" : "ayuda-anio"}
                />
                <p id="ayuda-anio" className="texto-ayuda">
                  Use un entero entre 1000 y 2100.
                </p>
                {erroresLocales.anio ? (
                  <p id="err-anio" className="error-campo" role="alert">
                    {erroresLocales.anio}
                  </p>
                ) : null}
              </div>

              <div className="campo">
                <label htmlFor="campo-genero">
                  Género <span className="requerido">(obligatorio)</span>
                </label>
                <select
                  id="campo-genero"
                  value={genero}
                  onChange={(ev) => setGenero(ev.target.value)}
                  aria-invalid={Boolean(erroresLocales.genero)}
                  aria-describedby={erroresLocales.genero ? "err-genero" : undefined}
                >
                  {GENEROS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
                {erroresLocales.genero ? (
                  <p id="err-genero" className="error-campo" role="alert">
                    {erroresLocales.genero}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="acciones-formulario">
              <button type="submit" className="btn primario" disabled={guardando}>
                {editandoId == null ? "Guardar nuevo" : "Actualizar"}
              </button>
              {editandoId != null ? (
                <button type="button" className="btn secundario" onClick={reiniciarFormulario}>
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel panel-lista" aria-labelledby="titulo-lista">
          <div className="lista-cabecera">
            <h2 id="titulo-lista" className="panel-titulo">
              Catálogo
            </h2>
            <button type="button" className="btn fantasma" onClick={cargarLista} disabled={cargandoLista}>
              Actualizar lista
            </button>
          </div>


          <div className="tabla-envoltorio" role="region" aria-label="Tabla de libros" tabIndex={0}>
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Autor</th>
                  <th scope="col">Año</th>
                  <th scope="col">Género</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {elementos.length === 0 && !cargandoLista ? (
                  <tr>
                    <td colSpan={5} className="celda-vacia">
                      No hay elementos para mostrar. Cree el primero usando el formulario.
                    </td>
                  </tr>
                ) : null}
                {elementos.map((libro) => (
                  <tr key={libro.id}>
                    <td>{libro.titulo}</td>
                    <td>{libro.autor}</td>
                    <td>{libro.anio}</td>
                    <td>{etiquetaGenero(libro.genero)}</td>
                    <td className="celda-acciones">
                      <button type="button" className="btn-enlace" onClick={() => iniciarEdicion(libro)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-enlace peligro"
                        onClick={() => setModalBorrar(libro)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>


      <div
        className={`mensaje-flotante ${mensajeTipo}`}
        role={mensajeTipo === "error" ? "alert" : "status"}
        aria-live="polite"
        hidden={!mensaje}
      >
        {mensaje}
      </div>

      {modalBorrar ? (
        <div className="modal-fondo" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-titulo"
            aria-describedby="modal-texto"
          >
            <h3 id="modal-titulo">Confirmar eliminación</h3>
            <p id="modal-texto">
              ¿Eliminar permanentemente &quot;{modalBorrar.titulo}&quot;? Esta acción no se puede deshacer
              desde la interfaz.
            </p>
            <div className="modal-acciones">
              <button type="button" className="btn secundario" onClick={() => setModalBorrar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn peligro" onClick={confirmarBorrado} disabled={guardando}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
