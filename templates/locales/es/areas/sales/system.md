# Mapa del sistema de ventas

## Cómo funciona tu sistema de ventas

Cada negocio pasa por los mismos cinco pasos:

1. **Descubrimiento**: entender qué le duele al cliente y quién decide.
2. **Validación**: demostrar que funciona y conocer a la persona que aprueba el presupuesto.
3. **Propuesta**: acordar el valor y el precio, y enviar la propuesta.
4. **Negociación**: acordar las condiciones finales y conseguir la firma.
5. **Cierre**: ganado o perdido, y lo que aprendimos.

Cómo usarlo en el día a día:

- **Antes de cada llamada**, pide a tu asistente la guía adecuada ("Tengo una llamada en frío con Acme en una hora, ayúdame a prepararla").
- **Después de cada llamada**, cuéntale a tu asistente cómo fue, o pega tus notas ("Registra esta llamada").
- **Una vez al mes**, pregúntale a tu asistente cómo van las cosas ("¿Cómo nos fue este mes?"). Te sugiere cambios y tú decides cuáles conservar.
- **¿Necesitas las palabras para decir?** Pide un guion a tu asistente ("Hazme un guion para X"). Ves una vista previa y decides antes de guardar nada.
- **¿No sabes qué significa un término?** Pregunta ("¿Qué significa X?"). Tu asistente guarda un glosario con tus términos y añade los nuevos cuando dices que sí.

Nunca necesitas editar esta página a mano: pide a tu asistente que cambie un paso o mejore una guía.

¿Quieres verlo? Pide a tu asistente: "Muéstrame mi proceso de ventas".

---

## Para tu asistente de IA

> Mapa interno. Úsalo para elegir la guía y la puerta adecuadas, pero nunca muestres esta tabla, los IDs de las guías, los códigos de situación ni las rutas de archivo a la persona. Habla de "la guía de llamada en frío", no de `plays/cold-call.md`.

### Etapa -> Guías -> Puerta

| Etapa | Puerta de salida | Guías |
| :--- | :--- | :--- |
| 1. Descubrimiento | Puerta 1: problema y su costo entendidos, aliado y persona que decide identificados, siguiente reunión agendada | [cold-call](./plays/cold-call.md), [discovery-call](./plays/discovery-call.md) |
| 2. Validación | Puerta 2: encaje confirmado, reunión con la persona que decide, plan conjunto acordado | [demo-call](./plays/demo-call.md), [follow-up](./plays/follow-up.md) |
| 3. Propuesta | Puerta 3: presupuesto confirmado, propuesta enviada, somos la opción preferida | [follow-up](./plays/follow-up.md) |
| 4. Negociación | Puerta 4: aprobaciones listas, condiciones acordadas, contrato enviado a firma | [follow-up](./plays/follow-up.md) |
| 5. Cierre | Contrato firmado o motivo de pérdida registrado, análisis posterior en `win-loss/` | Todavía no hay guía. Agrega una con las reglas de `/flow`. |

Los criterios de cada puerta están en [stages/pipeline-stages.md](./stages/pipeline-stages.md). Agrega una fila (o un enlace a la guía) aquí cada vez que agregues una guía.

### Cómo funcionan las guías

- Una guía = un tipo de conversación (una llamada, una reunión, un seguimiento), escrita como un árbol de decisiones con qué decir en cada situación.
- Una guía puede cubrir varias etapas (`stages: 2, 3, 4`).
- Registra qué guía y qué situación se usaron en cada registro de llamada (`play`, `branch`, `gate_advanced`) para que la retrospectiva mensual muestre qué funciona. Dedúcelos de las notas; no se los preguntes a la persona.
- Cambia una guía solo con las reglas de `/flow` o `/retro`, después de que la persona diga que sí.

### Guiones, glosario y paquetes por industria

> El cerebro no incluye guiones, glosario ni contenido por industria. Crea y cambia todo con `.agents/skills/script/SKILL.md`: una pregunta a la vez, vista previa con `clc-brain view --draft` y guardar solo cuando la persona diga que sí.

- Los guiones viven en `sales/scripts/<slug>.md` (un archivo por conjunto de guiones, con nombres de archivo en inglés). `clc-brain view` escribe la página `<slug>.html` junto a cada uno. Agrega una fila abajo por cada guion y pon `../scripts/<slug>.html#<anchor>` en la celda Guion de las filas de guía que cubra.
- El glosario es `sales/glossary.md`, que se crea con el primer término. Agrega aquí una línea que apunte a él.
- Un paquete por industria es un perfil de cliente en `sales/icps/<industry>.md`, un guion y filas de guía llamadas `<Situación> · <Industria>`. Agrega aquí una fila por paquete.

| Guion | Industria | Conversaciones |
| :--- | :--- | :--- |

| Industria | Perfil del cliente | Guion |
| :--- | :--- | :--- |
