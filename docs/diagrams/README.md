# Diagramas

El diagrama de componentes representa la topología de validación. Caddy está instalado en la VM. El gateway, los servicios, los workers y los PVC viven en K3s. Los diagramas de secuencia muestran rutas del código implementado.

- [Arquitectura](arquitectura.svg) ([fuente](arquitectura.mmd))
- [Aceptación e idempotencia](aceptacion.svg) ([fuente](aceptacion.mmd))
- [Reintento de correo](reintento.svg) ([fuente](reintento.mmd))
- [Reproceso explícito](reproceso.svg) ([fuente](reproceso.mmd))

Para reproducir los SVG, usa Mermaid CLI 11.12.0 y un navegador Chromium.
