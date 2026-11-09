# Demostración visual

1. Inicia sesión como `operador`. Revisa la ventana de las métricas y el UTC de los registros.
2. Abre **Agenda**, confirma una cita de Luna con ambos canales y conserva ambos IDs. Abre **Laboratorio** y genera un resultado ficticio de Max. Cada emisor usa su identidad propia.
3. Filtra por aplicación y canal. En un detalle de correo, lee las transiciones y el recibo del simulador. En un aviso interno, entra como `sofia` y comprueba que su bandeja solo contiene avisos propios.
4. En validación, elige **503 sostenido** en Simulador y aplica el modo. Genera ambos canales. El correo acumula tres intentos mientras la bandeja recibe el aviso.
5. Restaura el modo sano. Reprocesa el correo fallido, escribe un motivo y sigue el enlace de la derivada. El original permanece fallido.
6. Configura **Rechazo permanente** y envía un correo. El detalle muestra un solo intento. Restaura el modo sano.
7. Muestra en Grafana la espera, reintentos y población. Usa el incidente versionado para mostrar alerta y resolución. El disparo requiere el volumen mínimo, así que la prueba visual de un solo fallo no activa por sí sola la alerta.

`npm run demo-ui` reproduce el flujo en Chrome y guarda capturas con datos sintéticos. Para ejecutar en validación, usa las credenciales de ese ambiente y `API_URL` de su gateway.

Para una comprobación sana de producción usa el acceso, los dos emisores y la bandeja de los pasos 1–3. Los pasos de degradación, reproceso tras fallo y rechazo controlado se muestran desde validación o Compose. [Comprobación en Azure](evidence/ui-azure-main.json).
