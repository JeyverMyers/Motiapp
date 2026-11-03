"use client";

import { Check, Search } from "lucide-react";
import { useId, useState } from "react";

import { formatearPlaca } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { MotoVendible } from "@/server/repositorios/ventas";

/** Sin tildes, sin espacios ni guiones: «ABC 12D», «abc12d» y «Abc-12d» coinciden. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");
}

function etiqueta(moto: MotoVendible): string {
  return `${formatearPlaca(moto.placa)} · ${moto.marca} ${moto.modelo} ${moto.anio}`;
}

/** Cada palabra escrita tiene que aparecer en la placa, la marca, el modelo o el año. */
export function filtrarMotos(motos: MotoVendible[], consulta: string): MotoVendible[] {
  const palabras = normalizar(consulta).split(" ").filter(Boolean);
  if (palabras.length === 0) return motos;
  return motos.filter((moto) => {
    const texto = normalizar(`${moto.placa} ${moto.placa.replace(/\s/g, "")} ${moto.marca} ${moto.modelo} ${moto.anio}`);
    return palabras.every((palabra) => texto.includes(palabra));
  });
}

/**
 * Buscador de motos para «Nueva venta» (B5.1), sin dependencias: un campo de
 * texto que filtra la lista mientras se escribe, con el patrón ARIA de
 * combobox (flechas, Enter para elegir, Escape para cerrar). El id elegido
 * viaja en un input oculto con el mismo `name` que tenía el `<select>`, así que
 * la acción no cambia.
 */
export function BuscadorMoto({
  id,
  name,
  motos,
  valor,
  alElegir,
  invalido = false,
}: {
  id: string;
  name: string;
  motos: MotoVendible[];
  valor: string;
  alElegir: (motoId: string) => void;
  invalido?: boolean;
}) {
  const elegida = motos.find((moto) => moto.id === valor);
  const [consulta, setConsulta] = useState(elegida ? etiqueta(elegida) : "");
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const idLista = useId();

  // Con una moto elegida y el texto intacto, se muestra toda la lista al abrir.
  const filtro = elegida && consulta === etiqueta(elegida) ? "" : consulta;
  const resultados = filtrarMotos(motos, filtro);

  function elegir(moto: MotoVendible) {
    alElegir(moto.id);
    setConsulta(etiqueta(moto));
    setAbierto(false);
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      if (!abierto) return setAbierto(true);
      const paso = evento.key === "ArrowDown" ? 1 : -1;
      setActiva((actual) => (actual + paso + resultados.length) % Math.max(resultados.length, 1));
    } else if (evento.key === "Enter" && abierto) {
      evento.preventDefault();
      const moto = resultados[activa];
      if (moto) elegir(moto);
    } else if (evento.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={valor} />
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={abierto && resultados[activa] ? `${idLista}-${resultados[activa].id}` : undefined}
        aria-invalid={invalido || undefined}
        autoComplete="off"
        placeholder="Busca por placa, marca o modelo"
        value={consulta}
        onChange={(evento) => {
          setConsulta(evento.target.value);
          setActiva(0);
          setAbierto(true);
          if (valor) alElegir("");
        }}
        onFocus={() => setAbierto(true)}
        // Se cierra después del clic en una opción (que usa onMouseDown).
        onBlur={() => setAbierto(false)}
        onKeyDown={alTeclear}
        className="flex h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-invalid:border-destructive"
      />
      {abierto ? (
        <ul
          id={idLista}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-[var(--sombra-elevada)]"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-2.5 text-muted-foreground">Ninguna moto disponible coincide.</li>
          ) : (
            resultados.map((moto, indice) => (
              <li
                key={moto.id}
                id={`${idLista}-${moto.id}`}
                role="option"
                aria-selected={moto.id === valor}
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  elegir(moto);
                }}
                onMouseMove={() => setActiva(indice)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2",
                  indice === activa && "bg-accent text-accent-foreground",
                )}
              >
                <span className="font-semibold tabular-nums">{formatearPlaca(moto.placa)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {moto.marca} {moto.modelo} {moto.anio}
                </span>
                {moto.id === valor ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
