/** Prefijo de ruta según entorno. Vacío en local, "/agendamedidas" en producción. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
