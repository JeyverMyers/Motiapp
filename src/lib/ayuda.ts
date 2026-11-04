/**
 * Contenido del centro de ayuda (`/app/ayuda` y `/admin/ayuda`).
 *
 * Escrito para alguien que no usa mucho el computador: frases cortas, un paso
 * por línea y los nombres EXACTOS de los botones y campos que ve en pantalla
 * (entre comillas «»). Si cambia un texto de la interfaz, hay que cambiarlo
 * aquí también.
 */

export type PreguntaAyuda = {
  id: string;
  pregunta: string;
  /** Explicación corta, antes de los pasos. */
  respuesta?: string;
  /** Pasos numerados, en orden. */
  pasos?: string[];
  /** Un consejo o advertencia que vale la pena resaltar. */
  consejo?: string;
};

export type SeccionAyuda = {
  id: string;
  titulo: string;
  resumen: string;
  /** Solo para negocios con el plan Empresa (módulo de empeños). */
  soloConEmpenos?: boolean;
  preguntas: PreguntaAyuda[];
};

/* ------------------------------------------------------------------ */
/* Guía del dueño del negocio                                          */
/* ------------------------------------------------------------------ */

export const AYUDA_DUENO: SeccionAyuda[] = [
  {
    id: "primeros-pasos",
    titulo: "Primeros pasos",
    resumen: "Entrar, moverse por el sistema e instalarlo en el celular.",
    preguntas: [
      {
        id: "entrar",
        pregunta: "¿Cómo entro al sistema?",
        pasos: [
          "Abre la página de MotiApp en el navegador del celular o del computador.",
          "Toca «Entrar al panel».",
          "Escribe tu correo y la contraseña que te entregó el administrador.",
          "Toca «Entrar». Llegas al «Panel», la pantalla de inicio de tu negocio.",
        ],
        consejo:
          "La cuenta te la crea el administrador de MotiApp. No hay forma de crear una cuenta por tu cuenta.",
      },
      {
        id: "olvide-contrasena",
        pregunta: "Olvidé mi contraseña, ¿qué hago?",
        pasos: [
          "En la pantalla de entrada toca «¿Olvidaste tu contraseña?».",
          "Escribe tu correo y envía el formulario.",
          "Revisa tu correo (también la carpeta de spam) y sigue el enlace para poner una contraseña nueva.",
        ],
        consejo: "Si el correo no llega en unos minutos, escríbele al administrador de MotiApp.",
      },
      {
        id: "instalar",
        pregunta: "¿Cómo dejo MotiApp como una app en el celular?",
        respuesta: "Así se abre con un toque, como cualquier otra aplicación.",
        pasos: [
          "Abre la página principal de MotiApp en el celular.",
          "Arriba toca «Descargar app».",
          "En Android: confirma «Instalar».",
          "En iPhone: toca el botón Compartir (el cuadro con la flecha hacia arriba) y luego «Añadir a pantalla de inicio».",
        ],
      },
      {
        id: "moverse",
        pregunta: "¿Cómo me muevo entre las pantallas?",
        respuesta:
          "Arriba está el menú: «Panel», «Inventario», «Ventas», «Empeños», «Gastos», «Clientes» y «Ayuda». En el celular, si no ves todas las opciones, desliza el menú con el dedo hacia la izquierda.",
      },
      {
        id: "salir",
        pregunta: "¿Cómo cierro la sesión?",
        respuesta:
          "Toca «Salir», arriba a la derecha. Hazlo siempre que uses un computador o celular que no sea tuyo.",
      },
    ],
  },
  {
    id: "panel",
    titulo: "El panel (pantalla de inicio)",
    resumen: "El resumen del negocio y lo que necesita atención hoy.",
    preguntas: [
      {
        id: "que-muestra-panel",
        pregunta: "¿Qué me muestra el panel?",
        respuesta:
          "Arriba ves los números del negocio: lo que tienes invertido en motos, lo vendido y la ganancia. Si tu plan incluye empeños, también el dinero prestado y los intereses. Más abajo están las gráficas de los últimos 7, 30 o 90 días.",
      },
      {
        id: "alertas",
        pregunta: "¿Qué son las alertas del panel?",
        respuesta: "Son las cosas que debes atender primero:",
        pasos: [
          "Empeños vencidos: el cliente no pagó a tiempo. Puedes llamarlo con el botón «Llamar».",
          "Por vencer esta semana: empeños que vencen en los próximos 7 días.",
          "Motos con más de 60 días: motos que llevan mucho tiempo sin venderse y tienen tu dinero quieto.",
        ],
        consejo: "Toca el número de un empeño o el nombre de una moto para abrir su ficha.",
      },
      {
        id: "accesos-rapidos",
        pregunta: "¿Para qué son los botones grandes del panel?",
        respuesta:
          "Son atajos: «Vender una moto», «Registrar compra», «Nuevo empeño» y «Registrar gasto». Te llevan directo al formulario.",
      },
    ],
  },
  {
    id: "compras",
    titulo: "Comprar motos (inventario)",
    resumen: "Registrar cada moto que compras para saber cuánto te costó y cuánto ganas.",
    preguntas: [
      {
        id: "registrar-compra",
        pregunta: "Compré una moto, ¿cómo la registro?",
        pasos: [
          "Toca «Inventario» en el menú (o «Registrar compra» en el panel).",
          "Toca «Registrar compra».",
          "Escribe la placa, la marca, el modelo, el año y el color.",
          "Escribe el «Precio de compra» (lo que pagaste) y la «Fecha de compra».",
          "Si quieres, llena los datos de a quién se la compraste: «Le compré a (dueño anterior)», su cédula y su teléfono.",
          "Si ya sabes a cuánto la vas a vender, escribe el «Precio publicado».",
          "Toca el botón para guardar. La moto queda en el inventario.",
        ],
        consejo: "Los precios van en pesos, sin puntos ni signos. Ejemplo: 4500000.",
      },
      {
        id: "compra-vieja",
        pregunta: "¿Puedo registrar motos que compré antes de usar MotiApp?",
        respuesta:
          "Sí. Registra la moto normal y en «Fecha de compra» pon la fecha real en que la compraste. Los días en inventario y las alertas se cuentan desde esa fecha. Lo único que no se puede es una fecha futura.",
      },
      {
        id: "buscar-moto",
        pregunta: "¿Cómo encuentro una moto?",
        respuesta:
          "En «Inventario» usa el buscador: puedes escribir la placa, la marca o el modelo. Toca la moto para ver su ficha completa.",
      },
      {
        id: "estados-moto",
        pregunta: "¿Qué significan los estados de una moto?",
        pasos: [
          "Disponible: está lista para la venta.",
          "Reservada: alguien la apartó.",
          "En reparación: está en el taller.",
          "Vendida: ya se vendió (se marca sola al registrar la venta).",
          "Devuelta: se vendió y el comprador la devolvió.",
          "Dada de baja: ya no está para la venta (robo, chatarra, etc.).",
        ],
        consejo: "Para cambiarlo, abre la ficha de la moto y usa «Cambiar estado».",
      },
      {
        id: "corregir-moto",
        pregunta: "Me equivoqué en un dato de la moto, ¿cómo lo corrijo?",
        pasos: [
          "Abre la ficha de la moto desde «Inventario».",
          "Toca «Editar datos».",
          "Corrige lo que necesites y guarda.",
        ],
        consejo: "Si registraste una moto por error, en la ficha está «Borrar». Sus gastos no se pierden.",
      },
    ],
  },
  {
    id: "gastos",
    titulo: "Gastos",
    resumen: "Lo que gastas en las motos y en el local. Restan de la ganancia.",
    preguntas: [
      {
        id: "gasto-moto",
        pregunta: "Le arreglé algo a una moto, ¿dónde lo anoto?",
        respuesta: "En la ficha de esa moto. El gasto se suma a su costo y baja su ganancia real.",
        pasos: [
          "Abre la moto desde «Inventario».",
          "Baja hasta «Gastos de esta moto».",
          "Elige la «Categoría», escribe el «Monto», la «Fecha» y una «Descripción» corta (ejemplo: cambio de llantas, SOAT).",
          "Toca «Registrar gasto».",
        ],
      },
      {
        id: "gasto-general",
        pregunta: "¿Y los gastos del local, como el arriendo o los servicios?",
        respuesta: "Son gastos generales: no son de una moto en particular.",
        pasos: [
          "Toca «Gastos» en el menú.",
          "En «Registrar gasto general» elige el «Módulo»: compra y venta, o empeños.",
          "Elige la «Categoría», escribe el «Monto», la «Fecha» y la «Descripción».",
          "Toca «Registrar gasto». Se resta de la ganancia de ese mes.",
        ],
      },
      {
        id: "borrar-gasto",
        pregunta: "Anoté mal un gasto, ¿lo puedo quitar?",
        respuesta: "Sí. En la lista de «Gastos» cada gasto tiene el botón «Borrar». Luego regístralo de nuevo bien.",
      },
    ],
  },
  {
    id: "ventas",
    titulo: "Vender motos",
    resumen: "Registrar la venta, entregar el recibo y saber cuánto ganaste.",
    preguntas: [
      {
        id: "registrar-venta",
        pregunta: "Vendí una moto, ¿cómo registro la venta?",
        pasos: [
          "Toca «Ventas» en el menú (o «Vender una moto» en el panel).",
          "Toca «Registrar venta».",
          "Paso 1, la moto: en el buscador escribe la placa, la marca o el modelo y toca la moto en la lista.",
          "Paso 2, el comprador: escribe su nombre completo, su cédula y su celular. Si ya es cliente, se usa su ficha.",
          "Paso 3, el precio: el «Precio pactado» viene con el precio publicado; cámbialo si hiciste descuento. Debajo ves el descuento y la ganancia.",
          "Elige la «Forma de pago» y revisa la «Fecha de venta».",
          "Toca «Registrar la venta». La moto pasa a «Vendida».",
        ],
        consejo:
          "También puedes vender desde la ficha de la moto o desde la ficha de un cliente («Venderle una moto»).",
      },
      {
        id: "recibo",
        pregunta: "¿Cómo le doy el recibo al comprador?",
        pasos: [
          "Después de registrar la venta, toca «Recibo en PDF».",
          "El recibo se descarga con el nombre de la placa (por ejemplo ABC12D-recibo.pdf).",
          "Imprímelo o envíaselo por WhatsApp.",
        ],
      },
      {
        id: "venta-vieja",
        pregunta: "¿Puedo registrar ventas de antes de usar MotiApp?",
        pasos: [
          "Primero registra la moto en «Inventario» con su fecha de compra real.",
          "Después regístrale la venta con la «Fecha de venta» real.",
          "La venta aparece en el reporte del mes en que ocurrió.",
        ],
        consejo: "La fecha de venta no puede ser anterior a la de compra ni una fecha futura.",
      },
      {
        id: "devolucion",
        pregunta: "El comprador devolvió la moto, ¿qué hago?",
        pasos: [
          "Toca «Ventas» y busca la venta en el «Historial de ventas».",
          "Toca «Registrar devolución» y confirma.",
          "La venta deja de contar en las ganancias y la moto vuelve al inventario para venderla otra vez.",
        ],
        consejo: "La venta original no se borra: queda en el historial como devuelta.",
      },
      {
        id: "ganancia",
        pregunta: "¿Cómo sé cuánto he ganado?",
        respuesta:
          "En «Ventas» ves lo vendido, el costo de las motos, sus gastos y la ganancia. Con «Desde» y «Hasta» eliges el período (por ejemplo, el mes pasado). La ganancia de cada moto es: precio de venta − precio de compra − gastos de esa moto.",
      },
    ],
  },
  {
    id: "clientes",
    titulo: "Clientes",
    resumen: "La libreta de contactos con todo lo que cada cliente te compró o empeñó.",
    preguntas: [
      {
        id: "crear-cliente",
        pregunta: "¿Tengo que crear los clientes antes de venderles?",
        respuesta:
          "No. Al registrar una venta o un empeño con la cédula, el cliente se crea solo. Si quieres guardarlo antes, ve a «Clientes» y toca «Nuevo cliente».",
      },
      {
        id: "buscar-cliente",
        pregunta: "¿Cómo encuentro a un cliente?",
        respuesta: "En «Clientes» escribe en el buscador su nombre, su cédula (con o sin puntos) o su teléfono.",
      },
      {
        id: "ficha-cliente",
        pregunta: "¿Qué veo en la ficha de un cliente?",
        respuesta:
          "Sus datos de contacto, el total que te ha comprado, lo que te vendió, sus empeños y todo su historial. Desde ahí puedes «Venderle una moto» o registrarle un empeño, y con «Editar» corriges su teléfono o dirección.",
      },
    ],
  },
  {
    id: "empenos",
    titulo: "Empeños",
    resumen: "Prestar dinero con un bien en garantía, cobrar abonos y renovar.",
    soloConEmpenos: true,
    preguntas: [
      {
        id: "nuevo-empeno",
        pregunta: "¿Cómo registro un empeño nuevo?",
        pasos: [
          "Toca «Empeños» en el menú (o «Nuevo empeño» en el panel).",
          "Toca «Registrar empeño».",
          "El cliente: escribe la cédula, el celular y los nombres. Si ya es cliente, se usa su ficha.",
          "El bien: elige el «Tipo de bien» (moto, carro, teléfono u otro bien) y llena sus datos. Los campos cambian según el tipo.",
          "El préstamo: escribe el «Capital prestado» y el «Interés mensual (%)».",
          "Condiciones: revisa la «Frecuencia de pago», la «Fecha del empeño» y la fecha en que «Vence el» (por defecto, 30 días después).",
          "Si hay garante, llena sus datos. En «Observaciones» anota el estado del bien y los accesorios que deja.",
          "Toca «Registrar empeño».",
        ],
        consejo:
          "El número del empeño (EMP-0001, EMP-0002…) lo pone el sistema solo al guardar. No tienes que inventarlo.",
      },
      {
        id: "tipo-otro",
        pregunta: "Me dejan algo que no es moto, carro ni teléfono. ¿Qué elijo?",
        respuesta:
          "Elige «Otro bien». Solo se pide «¿Qué es?» (por ejemplo: taladro DeWalt con dos baterías) y el «Valor de tasación». La serie o referencia es opcional.",
      },
      {
        id: "contrato",
        pregunta: "¿Cómo imprimo el contrato del empeño?",
        pasos: [
          "Abre la ficha del empeño.",
          "Toca «Contrato en PDF». Se descarga con el número del empeño (por ejemplo EMP-0007-contrato.pdf).",
          "Imprímelo y que el cliente lo firme.",
        ],
      },
      {
        id: "como-se-calcula",
        pregunta: "¿Cómo se calcula el interés?",
        respuesta:
          "El interés corre por días: cada día suma la parte del interés mensual que le corresponde (un mes se cuenta de 30 días). En la ficha del empeño ves siempre, al día de hoy, el «Interés pendiente», el «Capital pendiente» y el total que debe el cliente. No tienes que hacer cuentas.",
      },
      {
        id: "abono",
        pregunta: "El cliente vino a pagar, ¿cómo registro el abono?",
        pasos: [
          "Abre la ficha del empeño (búscalo en «Empeños» por número, nombre o cédula).",
          "En «Registrar abono» escribe el «Monto».",
          "Atajos: «Solo el interés» llena el valor del interés pendiente; «Todo lo que debe» llena el total.",
          "En «Se aplica a» elige si es solo interés, solo capital o interés y capital.",
          "Revisa la «Fecha del pago» y el «Medio de pago».",
          "Toca «Registrar abono». El saldo se actualiza solo.",
        ],
        consejo: "Si el pago fue otro día, pon la fecha real: el interés se calcula hasta esa fecha.",
      },
      {
        id: "renovar",
        pregunta: "El cliente quiere más tiempo, ¿cómo renuevo?",
        pasos: [
          "En la ficha del empeño busca «Renovar el plazo».",
          "Escribe los «Días de plazo nuevo». Se cuentan desde el vencimiento, o desde hoy si ya venció.",
          "Al renovar se cobra el interés pendiente. Revisa el valor que muestra la pantalla.",
          "Toca «Renovar».",
        ],
      },
      {
        id: "liquidar",
        pregunta: "El cliente paga todo y se lleva su bien, ¿qué hago?",
        pasos: [
          "En la ficha del empeño busca «El cliente paga todo». Ahí ves cuánto debe hoy.",
          "Toca «Liquidar empeño» y confirma.",
          "El empeño queda como pagado y el cliente recupera su bien.",
        ],
      },
      {
        id: "vencido",
        pregunta: "El empeño venció y el cliente no ha venido, ¿qué pasa?",
        respuesta:
          "El empeño aparece como vencido en las alertas del panel y en la lista. Después del vencimiento hay 30 días de gracia en los que el cliente todavía puede pagar o renovar. Mientras tanto el interés sigue corriendo.",
      },
      {
        id: "perdido",
        pregunta: "Pasó la gracia y el cliente no volvió, ¿me puedo quedar con el bien?",
        pasos: [
          "Abre la ficha del empeño.",
          "Toca «Declarar perdido» y luego «Quedarse con el bien».",
          "Si el bien es una moto, puedes pasarla a tu inventario para venderla. Entra con un costo igual al capital que te quedaron debiendo.",
        ],
        consejo:
          "Antes de la fecha de vencimiento el bien sigue siendo del cliente: el sistema no deja declararlo perdido.",
      },
      {
        id: "gasto-empeno",
        pregunta: "Tuve un gasto con un bien empeñado (bodegaje, arreglo), ¿dónde lo anoto?",
        respuesta:
          "En la ficha del empeño hay un formulario de gasto. Ese gasto se descuenta de lo que ganas con los empeños.",
      },
    ],
  },
  {
    id: "problemas",
    titulo: "Problemas frecuentes",
    resumen: "Lo que más se pregunta cuando algo no sale como se espera.",
    preguntas: [
      {
        id: "no-puedo-entrar",
        pregunta: "No puedo entrar, me dice que la contraseña es incorrecta.",
        pasos: [
          "Revisa que el correo esté bien escrito y que no tengas las mayúsculas activadas.",
          "Usa «¿Olvidaste tu contraseña?» para poner una nueva.",
          "Si nada funciona, escríbele al administrador de MotiApp.",
        ],
      },
      {
        id: "suspendido",
        pregunta: "Me sale que mi negocio está suspendido.",
        respuesta:
          "El acceso se pausó (por ejemplo, por un pago pendiente). Tus datos NO se borran. Comunícate con el administrador de MotiApp; cuando lo reactive vuelves a entrar con todo como estaba.",
      },
      {
        id: "no-veo-empenos",
        pregunta: "No veo «Empeños» en el menú.",
        respuesta:
          "Los empeños vienen en el plan Empresa. Si tu negocio está en el plan Negociante (solo compra y venta), pídele al administrador que te cambie de plan.",
      },
      {
        id: "error-codigo",
        pregunta: "Me salió «Algo salió mal» con un código.",
        pasos: [
          "Toca «Intentar de nuevo».",
          "Si se repite, anota o toma foto del código que aparece.",
          "Envíaselo al administrador de MotiApp: con ese código encuentra qué pasó.",
        ],
      },
      {
        id: "datos-seguros",
        pregunta: "¿Otros negocios pueden ver mis datos?",
        respuesta: "No. Cada negocio solo ve su propia información. Ni siquiera otro dueño de MotiApp puede verla.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Guía del administrador de la plataforma                             */
/* ------------------------------------------------------------------ */

export const AYUDA_ADMIN: SeccionAyuda[] = [
  {
    id: "admin-negocios",
    titulo: "Dar de alta a un negocio",
    resumen: "Crear el negocio de un cliente y darle acceso a su dueño.",
    preguntas: [
      {
        id: "crear-negocio",
        pregunta: "¿Cómo creo el negocio de un cliente nuevo?",
        pasos: [
          "En «Negocios» toca «Nuevo negocio».",
          "Escribe el nombre del negocio y, si los tienes, NIT, teléfono, correo, ciudad y dirección.",
          "Elige el plan: «Negociante» si solo compra y vende motos, «Empresa» si además presta con empeño.",
          "Toca «Crear negocio». Quedas en la ficha del negocio.",
        ],
      },
      {
        id: "dar-acceso",
        pregunta: "¿Cómo le doy acceso al dueño?",
        pasos: [
          "En la ficha del negocio, en la parte de usuarios, escribe el correo y el nombre del dueño.",
          "Toca «Dar acceso».",
          "Si el correo no tenía cuenta, se crea con una contraseña temporal que aparece en el aviso verde. Cópiala en ese momento: no se vuelve a mostrar.",
          "Envíale al dueño, por un canal privado (WhatsApp directo), el enlace, su correo y esa contraseña.",
        ],
        consejo:
          "Si sale «Ya existe una cuenta con ese correo», NO marques la casilla salvo que sepas por qué existe. Una cuenta que tú no creaste pudo crearla otra persona.",
      },
      {
        id: "cambiar-plan",
        pregunta: "¿Cómo cambio el plan o el estado de un negocio?",
        respuesta:
          "En la ficha del negocio, en la sección del plan, elige el plan y el estado y guarda. Al pasar a «Negociante» el dueño deja de ver los empeños; sus datos de empeños no se borran.",
      },
    ],
  },
  {
    id: "admin-suspender",
    titulo: "Suspender, quitar acceso y soporte",
    resumen: "Pausar un negocio por falta de pago o ayudar a un dueño.",
    preguntas: [
      {
        id: "suspender",
        pregunta: "¿Cómo suspendo un negocio por falta de pago?",
        pasos: [
          "Abre la ficha del negocio.",
          "Arriba toca «Suspender» y confirma.",
          "El dueño ya no puede entrar. No se borra nada.",
          "Cuando pague, toca «Reactivar» y vuelve a entrar con todo como estaba.",
        ],
      },
      {
        id: "quitar-acceso",
        pregunta: "¿Cómo le quito el acceso a una persona sin suspender el negocio?",
        respuesta:
          "En la ficha del negocio, en la lista de usuarios, toca «Quitar acceso» junto a esa persona. «Devolver acceso» lo revierte.",
      },
      {
        id: "modo-soporte",
        pregunta: "Un dueño dice que algo no le cuadra, ¿cómo veo lo que él ve?",
        pasos: [
          "En la ficha del negocio, en «Modo soporte», escribe el motivo (por ejemplo: revisar el reporte de ventas de octubre).",
          "Toca «Entrar en modo soporte». Ves el panel del dueño tal cual, solo para mirar: no puedes cambiar nada.",
          "Arriba aparece un aviso mientras dura. Se cierra solo a las 2 horas, o sales antes desde el aviso.",
        ],
        consejo: "Cada entrada queda registrada en «Auditoría» con su motivo.",
      },
      {
        id: "auditoria",
        pregunta: "¿Dónde veo lo que se ha hecho en la administración?",
        respuesta:
          "En «Auditoría»: cada negocio creado, cada cambio de plan o estado, cada acceso dado y cada entrada en modo soporte, con fecha y quién lo hizo. No se puede borrar ni editar.",
      },
    ],
  },
  {
    id: "admin-solicitudes",
    titulo: "Solicitudes y limpieza",
    resumen: "Las personas que piden información y los negocios creados por error.",
    preguntas: [
      {
        id: "ver-solicitudes",
        pregunta: "¿Dónde veo a quién le interesa MotiApp?",
        respuesta:
          "En «Solicitudes» llegan los formularios de la página principal, con nombre, negocio, teléfono y mensaje. Debajo del contacto dice si la persona aceptó recibir comunicaciones comerciales: solo a esas les puedes mandar publicidad.",
      },
      {
        id: "borrar-negocio",
        pregunta: "Creé un negocio por error, ¿lo puedo borrar?",
        respuesta:
          "Solo si está vacío (sin motos, ventas, clientes, empeños ni gastos). En la ficha del negocio aparece la opción de borrarlo y hay que escribir su nombre para confirmar. Un negocio con datos se suspende, no se borra.",
      },
    ],
  },
];
