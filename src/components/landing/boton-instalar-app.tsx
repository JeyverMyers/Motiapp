"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BOTON_CONTORNO, BOTON_LLENO } from "./estilos";

/** El evento que Chrome y Android disparan cuando la PWA se puede instalar. */
type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Modo = "ios" | "escritorio";

function esIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac: se reconoce por la pantalla táctil.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * «Descargar app»: instala la PWA según el dispositivo (DN8).
 *
 * - Android / Chrome / Edge: el instalador nativo del navegador
 *   (`beforeinstallprompt`).
 * - iPhone / iPad: Safari no tiene ese evento; se explican los dos toques.
 * - Escritorio sin instalador: el enlace para abrir en el celular.
 *
 * Si ya se abrió como app instalada, el botón no aparece.
 */
const CONSULTA_APP = "(display-mode: standalone)";

function suscribirModoApp(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_APP);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

export function BotonInstalarApp({ className = "" }: { className?: string }) {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  // Abierta como app instalada: se lee del navegador (en el servidor, «no»).
  const enModoApp = useSyncExternalStore(
    suscribirModoApp,
    () => window.matchMedia(CONSULTA_APP).matches,
    () => false,
  );
  const [instalada, setInstalada] = useState(false);
  const [modo, setModo] = useState<Modo>("escritorio");
  const [copiado, setCopiado] = useState(false);
  // Se lee al abrir el diálogo, no al renderizar: en el servidor no hay host y
  // leerlo en el render rompía la hidratación.
  const [host, setHost] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    const listo = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", listo);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", listo);
    };
  }, []);

  if (enModoApp || instalada) return null;

  async function instalar() {
    if (evento) {
      await evento.prompt();
      await evento.userChoice;
      setEvento(null);
      return;
    }
    setModo(esIos() ? "ios" : "escritorio");
    setHost(window.location.host);
    setCopiado(false);
    dialogo.current?.showModal();
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={instalar}
        className={`${BOTON_CONTORNO} h-11 gap-2 px-4 whitespace-nowrap ${className}`}
      >
        <Download className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Descargar app</span>
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby="titulo-instalar"
        className="m-auto w-[min(92vw,26rem)] rounded-tarjeta border border-carbon bg-paper-white p-6 font-ui text-carbon backdrop:bg-carbon/40"
        onClick={(e) => {
          // Clic en el fondo (fuera de la tarjeta) cierra.
          if (e.target === dialogo.current) dialogo.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="titulo-instalar" className="text-xl font-bold tracking-[-0.01em]">
            {modo === "ios" ? "Instálala en tu iPhone" : "Ábrela en tu celular"}
          </h2>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-carbon"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {modo === "ios" ? (
          <ol className="mt-5 flex flex-col gap-4 text-[15px] font-medium">
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-carbon bg-sky-wash">
                <Share className="size-4" aria-hidden="true" />
              </span>
              <span>
                En Safari, toca <strong>Compartir</strong> (el cuadro con la flecha hacia arriba).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-carbon bg-sunburst">
                <SquarePlus className="size-4" aria-hidden="true" />
              </span>
              <span>
                Elige <strong>Añadir a pantalla de inicio</strong> y confirma. Motiapp queda como una app más.
              </span>
            </li>
          </ol>
        ) : (
          <div className="mt-5 flex flex-col gap-4 text-[15px] font-medium">
            <p>
              Motiapp se instala desde el celular. Abre este enlace en Chrome (Android) o Safari (iPhone) y toca
              «Descargar app» otra vez:
            </p>
            <p className="rounded-full border border-carbon bg-soft-mist px-4 py-2.5 text-center font-bold break-all">
              {host}
            </p>
            <button type="button" onClick={copiarEnlace} className={`${BOTON_LLENO} h-11`}>
              {copiado ? "Enlace copiado" : "Copiar enlace"}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
