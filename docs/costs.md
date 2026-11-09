# Presupuesto y consumo

La suscripción Azure for Students mostró **US$96 de US$100 disponibles** en Educación el 8 de noviembre de 2026. También mostró **US$2.55** de costo de noviembre para toda la suscripción, que contiene proyectos distintos. Ese importe carece de atribución a VetNotify. El proyecto usa grupos dedicados con etiqueta `Project=VetNotify`.

| Recurso en México Central | Tarifa pública consultada |
|---|---:|
| B2as v2 Linux | US$0.0827/h |
| SSD Standard E6 64 GiB | US$5.28/mes |
| Operaciones de SSD E6 | US$0.0022 por 10 000 |
| IPv4 pública Standard | US$0.005/h |
| Storage LRS de estado | Consumo por bytes y operaciones. Reserva estimada <US$0.50/mes |
| Salida de red | Variable. Reserva de laboratorio US$2.00 |

Con 12 h de cómputo y 7 días de IP, el subtotal base estimado con un mes de disco es US$7.11. Con las reservas de estado y salida, queda alrededor de US$9.61 antes de operaciones de disco. El tamaño y las horas se controlan para permanecer bajo el tope acumulado de US$100. [API oficial de precios de Azure](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices).

El presupuesto mensual de US$20 del grupo de workload usa avisos al 50%, 75% y 90%. La operación lleva el acumulado de ambos grupos independientemente del reinicio mensual. Las alertas y los cargos tienen retraso. Consulta `Cost Management > Cost analysis` filtrando los dos grupos. Si la API aún no devuelve cargos atribuibles, registra «no disponible» con fecha.

La consulta de cargos reales de los dos grupos regresó una tabla vacía el 8 de noviembre. Una consulta posterior recibió HTTP 429. Los cargos atribuibles aún no están disponibles. El servicio de apagado programado de Azure requiere que el schedule viva en la misma región que la VM. México Central no ofrece ese recurso para esta suscripción. El control del cómputo usa `cloud-stop` y `cloud-start`. [Evidencia de Azure](evidence/azure-platform.json).

```powershell
npm run cloud-status -- -Subscription ID -Suffix 26a7d1
npm run cloud-start -- -Subscription ID -Suffix 26a7d1
npm run cloud-stop -- -Subscription ID -Suffix 26a7d1
```

Azure confirmó la desasignación al finalizar la verificación. El disco, la IP y el estado siguen facturando según uso. `cloud-destroy` produce un plan de eliminación del workload y exige revisar destino antes de aplicar. El bootstrap del estado se conserva por separado. [Estado final](evidence/azure-closeout.json) · [Presupuestos Azure](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).
