"use client";

import { Lightbulb, Printer, Search } from "lucide-react";
import { useRef, useState } from "react";

import { Boton } from "@/components/ui/boton";
import type { PreguntaAyuda, SeccionAyuda } from "@/lib/ayuda";

/** Sin tildes ni mayúsculas: «empeno» encuentra «empeño». */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function textoDe(pregunta: PreguntaAyuda): string {
  return normalizar([pregunta.pregunta, pregunta.respuesta, ...(pregunta.pasos ?? []), pregunta.consejo].join(" "));
}

/**
 * Centro de ayuda: buscador, índice por temas y preguntas desplegables con
 * pasos numerados. «Imprimir o guardar en PDF» abre todas las respuestas antes
 * de imprimir, así el documento impreso sale completo.
 */
export function CentroAyuda({ secciones }: { secciones: { titulo?: string; lista: SeccionAyuda[] }[] }) {
  const [consulta, setConsulta] = useState("");
  const contenedor = useRef<HTMLDivElement>(null);
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  const coincide = (pregunta: PreguntaAyuda) => palabras.every((palabra) => textoDe(pregunta).includes(palabra));

  const grupos = secciones.map((grupo) => ({
    ...grupo,
    lista: grupo.lista
      .map((seccion) => ({ ...seccion, preguntas: seccion.preguntas.filter(coincide) }))
      .filter((seccion) => seccion.preguntas.length > 0),
  }));
  const hayResultados = grupos.some((grupo) => grupo.lista.length > 0);
  const buscando = palabras.length > 0;

  function imprimir() {
    contenedor.current?.querySelectorAll("details").forEach((detalle) => (detalle.open = true));
    window.print();
  }

  return (
    <div ref={contenedor} className="flex flex-col gap-6">
      <div className="no-imprimir flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar en la ayuda</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="¿Qué necesitas hacer? Ejemplo: registrar una venta"
            className="h-12 w-full rounded-xl border border-input bg-card pr-4 pl-11 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
          />
        </label>
        <Boton type="button" variant="outline" onClick={imprimir} className="h-12">
          <Printer className="size-5" aria-hidden />
          Imprimir o guardar en PDF
        </Boton>
      </div>

      {!buscando ? (
        <nav aria-label="Temas de la ayuda" className="no-imprimir flex flex-wrap gap-2">
          {grupos.flatMap((grupo) => grupo.lista).map((seccion) => (
            <a
              key={seccion.id}
              href={`#${seccion.id}`}
              className="rounded-full border bg-card px-4 py-2 text-sm font-semibold shadow-xs transition-colors duration-150 hover:border-foreground/30 hover:bg-accent"
            >
              {seccion.titulo}
            </a>
          ))}
        </nav>
      ) : null}

      {!hayResultados ? (
        <p className="superficie p-6 text-base">
          No encontramos nada con «{consulta}». Prueba con otra palabra, por ejemplo «venta», «abono» o «contraseña».
        </p>
      ) : null}

      {grupos.map((grupo, indice) =>
        grupo.lista.length === 0 ? null : (
          <div key={grupo.titulo ?? indice} className="flex flex-col gap-6">
            {grupo.titulo ? (
              <h2 className="mt-2 text-xl font-bold tracking-[-0.015em]">{grupo.titulo}</h2>
            ) : null}
            {grupo.lista.map((seccion) => (
              <section key={seccion.id} id={seccion.id} aria-labelledby={`${seccion.id}-titulo`} className="scroll-mt-24">
                <h3 id={`${seccion.id}-titulo`} className="text-lg font-bold tracking-[-0.01em]">
                  {seccion.titulo}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{seccion.resumen}</p>
                <div className="superficie mt-3 divide-y">
                  {seccion.preguntas.map((pregunta) => (
                    <Pregunta key={pregunta.id} pregunta={pregunta} abierta={buscando} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function Pregunta({ pregunta, abierta }: { pregunta: PreguntaAyuda; abierta: boolean }) {
  return (
    <details id={pregunta.id} open={abierta || undefined} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold transition-colors duration-150 hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
        {pregunta.pregunta}
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full border text-lg leading-none transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-5 pb-5 text-base leading-relaxed">
        {pregunta.respuesta ? <p>{pregunta.respuesta}</p> : null}
        {pregunta.pasos ? (
          <ol className="flex flex-col gap-2.5">
            {pregunta.pasos.map((paso, numero) => (
              <li key={numero} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular-nums">
                  {numero + 1}
                </span>
                <span className="pt-0.5">{paso}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {pregunta.consejo ? (
          <p className="flex gap-2.5 rounded-lg border border-alerta/40 bg-alerta/10 px-4 py-3 font-medium">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-alerta" aria-hidden />
            {pregunta.consejo}
          </p>
        ) : null}
      </div>
    </details>
  );
}
