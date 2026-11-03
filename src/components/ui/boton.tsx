import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactElement } from "react";
import { cloneElement, isValidElement } from "react";

import { cn } from "@/lib/utils";

const variantesBoton = cva(
  // Presión: escala 0.97 en 150 ms con curva de salida fuerte (Emil Kowalski).
  // Se animan propiedades concretas, nunca `all`.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-salida)] active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--sombra-boton)] hover:bg-primary/88",
        destructive: "bg-destructive text-destructive-foreground shadow-[var(--sombra-boton)] hover:bg-destructive/90",
        outline: "border bg-card shadow-xs hover:border-foreground/20 hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        exito: "bg-exito text-exito-foreground shadow-[var(--sombra-boton)] hover:bg-exito/90",
      },
      size: {
        // h-11 son 44px: el mínimo cómodo para el pulgar en el celular.
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icono: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type PropsBoton = ComponentProps<"button"> &
  VariantProps<typeof variantesBoton> & {
    /**
     * Pasa las clases y el resto de props al hijo en lugar de renderizar un
     * `<button>`. Sirve para envolver un `<Link>` sin anidar botón dentro de
     * enlace, que es HTML inválido.
     */
    asChild?: boolean;
  };

export function Boton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: PropsBoton) {
  const clases = cn(variantesBoton({ variant, size, className }));

  if (asChild && isValidElement(children)) {
    const hijo = children as ReactElement<{ className?: string }>;
    return cloneElement(hijo, {
      className: cn(clases, hijo.props.className),
    });
  }

  return (
    <button className={clases} {...props}>
      {children}
    </button>
  );
}

export { variantesBoton };
