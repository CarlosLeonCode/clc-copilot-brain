# Mapa del sistema de ventas

## Cómo funciona tu sistema de ventas

Vendemos como un médico que diagnostica: primero entendemos qué le duele al negocio y solo después mostramos la solución. Cada venta pasa por los mismos cinco pasos:

1. **Contacto**: presentarte en 30 segundos, ver si el negocio se identifica con algún problema y agendar una reunión con quien decide.
2. **Dolor**: entender qué le está costando hoy el problema al negocio y si de verdad quiere resolverlo.
3. **Presupuesto y decisión**: confirmar que la inversión tiene sentido frente a lo que pierde, y quién decide, cómo y para cuándo.
4. **Presentación**: mostrar la solución solo contra el problema que ya confirmamos, con quien decide presente.
5. **Cierre**: un sí claro con fecha de inicio o un no claro. Los dos son buenos resultados; "luego te aviso" no lo es.

Tres reglas para cada conversación:

- **Escucha más de lo que hablas**: el cliente habla el 70% del tiempo y tú el 30%.
- **Habla de igual a igual**: no pides favores; revisan juntos si tiene sentido.
- **Cierra la venta o cierra el expediente**: ninguna conversación termina sin día y hora para el siguiente paso, o sin un no.

Cómo usarlo en el día a día:

- **Antes de cada llamada**, pide a tu asistente la guía adecuada ("Tengo una llamada en frío en una hora, ayúdame a prepararla").
- **Después de cada llamada**, cuéntale a tu asistente cómo fue, o pega tus notas ("Registra esta llamada").
- **Una vez al mes**, pregúntale a tu asistente cómo van las cosas ("¿Cómo nos fue este mes?"). Te sugiere cambios y tú decides cuáles conservar.
- **¿Necesitas las palabras para decir?** Pide un guion a tu asistente ("Hazme un guion para X"). Ves una vista previa y decides antes de guardar nada.
- **¿No sabes qué significa un término?** Pregunta ("¿Qué es el acuerdo previo?"). Tu asistente guarda un glosario con los términos de tu método y añade los nuevos cuando dices que sí.

Nunca necesitas editar esta página a mano: pide a tu asistente que cambie un paso o mejore una guía.

¿Quieres verlo? Pide a tu asistente: "Muéstrame mi proceso de ventas".

---

## Para tu asistente de IA

> Mapa interno. Úsalo para elegir la guía y la puerta adecuadas, pero nunca muestres esta tabla, los IDs de las guías, los códigos de situación ni las rutas de archivo a la persona. Habla de "la guía de llamada en frío", no de `plays/cold-call.md`.

### Etapa -> Guías -> Puerta

| Etapa | Puerta de salida | Guías |
| :--- | :--- | :--- |
| 1. Contacto | Puerta 1: el prospecto se identificó con un dolor, sabemos quién decide y hay una reunión de diagnóstico con esa persona con día y hora | [cold-call](./plays/cold-call.md), [follow-up](./plays/follow-up.md) |
| 2. Dolor | Puerta 2: acuerdo previo hecho, dolor descrito en sus palabras con un ejemplo, su costo al mes calculado por el prospecto y quiere resolverlo ahora | [discovery-call](./plays/discovery-call.md) |
| 3. Presupuesto y decisión | Puerta 3: invertir tiene sentido frente al costo al mes, quien decide estará en la presentación, sabemos cómo y para cuándo decide, y la presentación está agendada | [discovery-call](./plays/discovery-call.md), [follow-up](./plays/follow-up.md) |
| 4. Presentación | Puerta 4: quien decide vio la solución contra su dolor y dio un sí o un no | [demo-call](./plays/demo-call.md), [follow-up](./plays/follow-up.md) |
| 5. Cierre | Un sí con el postcierre hecho y fecha de inicio, o un no registrado con su motivo; análisis en `win-loss/` | [demo-call](./plays/demo-call.md) |

Los criterios de cada puerta están en [stages/pipeline-stages.md](./stages/pipeline-stages.md), la calificación (acuerdo previo, dolor, presupuesto, decisión) en [qualification/qualification-matrix.md](./qualification/qualification-matrix.md) y los términos del método en [glossary.md](./glossary.md). Agrega una fila (o un enlace a la guía) aquí cada vez que agregues una guía.

### Reglas del método

- Orden fijo: dolor, luego presupuesto, luego decisión. Nunca propongas una presentación ni envíes precios o material antes de tener los tres.
- Cada reunión empieza con un acuerdo previo: cuánto dura, para qué es, permiso para que los dos digan que no y el siguiente paso si tiene sentido.
- Cuando contesta alguien que no decide, pide dos veces la reunión con quien decide e invita también a quien contestó.
- El costo al mes del dolor lo calcula el prospecto, nunca tú. Nunca inventes cifras, precios ni funciones que no estén en el perfil de la empresa.

### Cómo funcionan las guías

- Una guía = un tipo de conversación (una llamada, una reunión, un seguimiento), escrita como un árbol de decisiones con qué decir en cada situación.
- Una guía puede cubrir varias etapas (`stages: 2, 3`).
- Registra qué guía y qué situación se usaron en cada registro de llamada (`play`, `branch`, `gate_advanced`) para que la retrospectiva mensual muestre qué funciona. Dedúcelos de las notas; no se los preguntes a la persona.
- Cambia una guía solo con las reglas de `/flow` o `/retro`, después de que la persona diga que sí.

### Guiones, glosario y paquetes por industria

> El cerebro incluye el glosario del método, pero no guiones ni contenido por industria. Crea y cambia todo con `.agents/skills/script/SKILL.md`: una pregunta a la vez, vista previa con `clc-brain view --draft` y guardar solo cuando la persona diga que sí.

- Los guiones viven en `sales/scripts/<slug>.md` (un archivo por conjunto de guiones, con nombres de archivo en inglés). `clc-brain view` escribe la página `<slug>.html` junto a cada uno. Agrega una fila abajo por cada guion y pon `../scripts/<slug>.html#<anchor>` en la celda Guion de las filas de guía que cubra.
- El glosario es `sales/glossary.md`. Empieza con los términos del método; agrega en él los términos propios del equipo.
- Un paquete por industria es un perfil de cliente en `sales/icps/<industry>.md`, un guion y filas de guía llamadas `<Situación> · <Industria>`. Agrega aquí una fila por paquete.

| Guion | Industria | Conversaciones |
| :--- | :--- | :--- |

| Industria | Perfil del cliente | Guion |
| :--- | :--- | :--- |
