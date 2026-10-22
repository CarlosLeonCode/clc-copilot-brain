---
play: follow-up
stages: 1, 3, 4
goal: Conseguir un sí, un no o un siguiente paso con día y hora
gate_unlocked: Siguiente puerta
version: 1
status: active
motions: all
success: El cliente acordó un siguiente paso con día y hora, o dijo que no
---
# Guía: Seguimiento

> **Objetivo:** llamar el día acordado, pedir un sí o un no y nunca dejar un "lo voy a pensar" sin día y hora. Cierra la venta o cierra el expediente.
> **Etapas:** 1, 3, 4. **Puertas:** ver [pipeline-stages](../stages/pipeline-stages.md). **Relacionadas:** [cold-call](./cold-call.md), [demo-call](./demo-call.md).

## Árbol de decisiones

```mermaid
flowchart TD
    B1["Llamar el día y la hora acordados"] --> B2{"¿Contesta?"}
    B2 -->|"Sí"| B3{"¿Sí, no o más tiempo?"}
    B2 -->|"No"| B4["Segundo y tercer intento en días fijos"]
    B3 -->|"Sí"| B5["Agendar el siguiente paso"]
    B3 -->|"No"| B6["Agradecer y cerrar el expediente"]
    B3 -->|"Más tiempo"| B7["Encontrar la duda real con una reversión"]
    B7 -->|"Duda resuelta"| B5
    B7 -->|"Sigue vago"| B8["Acordar un último día y hora"]
    B4 -->|"Contesta"| B3
    B4 -->|"Sin respuesta"| B6
```

## Situaciones

| Situación | Cuándo pasa | Qué decir | Guion |
| :--- | :--- | :--- | :--- |
| B1 | Día de seguimiento acordado | "Quedamos en hablar hoy para ver si avanzamos o no. ¿Cómo lo ves?" | — |
| B2 | Esperas una respuesta | Llama; no te quedes solo en mensajes. | — |
| B3 | El cliente contesta | Pide una respuesta clara: "¿Es un sí, un no, o falta algo?" | — |
| B4 | No contesta | Dos intentos más en días y horas fijos, cada uno con un mensaje corto. | — |
| B5 | Un sí o una duda resuelta | Agenda el siguiente paso con día y hora y anota en el registro de la llamada que el negocio avanzó. | — |
| B6 | Un no, o tres intentos sin respuesta | "Gracias por decírmelo claro." Registra el motivo y cierra el expediente. | — |
| B7 | "Lo voy a pensar" | Reversión: "Normalmente, cuando alguien me dice eso, queda alguna duda. ¿Cuál es?" | — |
| B8 | Sigue sin respuesta clara | "¿Lo dejamos para el [día] a las [hora], y si no es para ti, me dices que no?" | — |

## Registro de aprendizajes

<!-- Formato: - YYYY-MM-DD vN->vN+1: cambio (evidencia: CALL-...) -->
- Todavía no hay entradas. `/retro` propone cambios aquí cuando haya suficientes llamadas registradas.
