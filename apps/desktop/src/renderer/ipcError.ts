/** Texto de um erro vindo do main, sem o prefixo que o Electron acrescenta. */
export const ipcErrorText = (err: unknown, fallback: string) =>
  err instanceof Error
    ? err.message.replace(/^Error invoking remote method '[^']*': (Error: )?/, '')
    : fallback;
