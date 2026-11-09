# Tarea Unidad 6: Interfaz + API Gateway

Interfaz web para el chat del curso. Usa el chat base (users, channels, messages), nuestro microservicio **profiles** y los microservicios de otros dos equipos: **media** y **polls**.

Esta entrega se ejecuta localmente con docker-compose, como pide el enunciado de la unidad. No se desplegó en el cluster de Kubernetes. El microservicio profiles sí se desplegó en Kubernetes en la entrega anterior.

La interfaz **solo se comunica con el API Gateway** (GraphQL). El gateway llama a cada microservicio mediante su API REST pública y junta los datos que necesita cada vista.

### [Link al video](https://drive.google.com/file/d/1ad0ISkUbYuPreGeJ2gvAXZiorJiw1usS/view?usp=sharing)

```
                 ┌──────────────┐
  Navegador ───▶ │  Interfaz    │  React + Chakra UI + Apollo   (localhost:3000)
                 └──────┬───────┘
                        │ GraphQL
                 ┌──────▼───────┐
                 │ API Gateway  │  Ariadne + FastAPI            (localhost:8080/graphql/)
                 └──────┬───────┘
        REST ┌──────────┼──────────┬───────────┬──────────┬──────────┐
             ▼          ▼          ▼           ▼          ▼          ▼
          users     channels   messages    profiles     media      polls
         (base)     (base)     (base)      (nuestro)  (equipo)   (equipo)
```

## Cómo ejecutarlo

```bash
docker compose up --build
```

| Qué | URL |
| --- | --- |
| **Interfaz** | http://localhost:3000 |
| **API Gateway** (explorador GraphQL) | http://localhost:8080/graphql/ |
| Swagger de users / channels / messages | http://localhost:8001/docs · 8002 · 8003 |
| Swagger de polls / media / profiles | http://localhost:8004/docs · 8005 · 8006 |

Todos los contenedores quedan en la red de docker-compose **`microsvcs`**.

Para apagar: `docker compose down`. Para borrar también los datos: `docker compose down -v`.

## Estructura del repositorio

| Carpeta | Contenido | ¿Quién lo hizo? |
| --- | --- | --- |
| `interface/` | Interfaz web (React + Chakra UI + Apollo Client) | Esta entrega |
| `api-gateway/` | API Gateway GraphQL (Ariadne + FastAPI) | Esta entrega |
| `profiles/` | Microservicio de perfiles (entrega anterior) | Nuestro equipo |
| `servicios-base/` | users, channels y messages | Profesor (chat base) |
| `servicios-externos/media/` | Archivos adjuntos por canal | Otro equipo, **sin modificar** |
| `servicios-externos/polls/` | Encuestas | Otro equipo, **sin modificar** |

Origen del código de los otros equipos:

- Media: https://github.com/667r/microservicios/tree/codex/media-service/03_Comunicaci%C3%B3n/demo/media
- Polls: https://github.com/TomasCano-Usm/INF326-Microservicio-Polls

Los servicios de otros equipos solo se **configuran** con variables de entorno en `docker-compose.yaml`; su código no se tocó. Por ejemplo, a polls se le activa `MESSAGES_ENABLED=true` para que anuncie cada encuesta en el chat.

**Única modificación al chat base:** en `channels` y `messages` del profesor, `insert_one(...)` agregaba un `_id` de MongoDB al diccionario que después se devolvía. Ese `_id` no se puede convertir a JSON, así que crear un canal o un mensaje respondía error 500. Se corrigió insertando una copia (`insert_one(dict(...))`), igual que ya hacía `users`. Está marcado con un comentario `CORRECCIÓN`.

## Funcionalidades de la interfaz

| Funcionalidad | Servicios que usa (a través del gateway) |
| --- | --- |
| Crear usuarios y elegir con cuál se actúa | users |
| Crear y listar canales | channels |
| Ver y enviar mensajes (con nombre, estado y foto del autor) | messages + users + profiles |
| Ver el perfil de cualquier usuario (clic en su nombre) | profiles |
| Editar mi perfil: bio, estado, intereses, idiomas y redes | profiles |
| Subir, cambiar y quitar mi foto de perfil | profiles |
| Subir, ver, descargar y eliminar archivos del canal | media + users |
| Crear encuestas, votar, cerrarlas y ver resultados | polls + messages + users |

## API Gateway

Está hecho con Ariadne + FastAPI, igual que la demo del curso. Tiene un archivo de esquema y uno de resolvers por servicio:

- `app/schemas/*.graphql`: tipos, queries y mutations (`chat`, `profiles`, `media`, `polls`).
- `app/routes/*.py`: resolvers que llaman a cada microservicio.
- `app/clients.py`: URLs de los servicios y manejo de errores.

**Queries:** `listUsers`, `getUser`, `listChannels`, `getChannel`, `listMessages`, `getProfile`, `listAttachments`, `listPolls`, `getPoll`.

**Mutations:** `createUser`, `createChannel`, `sendMessage`, `updateProfile`, `uploadAvatar`, `deleteAvatar`, `uploadAttachment`, `deleteAttachment`, `createPoll`, `votePoll`, `closePoll`.

Decisiones principales:

- **Agregación.** Un mensaje trae su `author` (users) y el `profile` del autor (profiles) en una sola consulta. Los usuarios repetidos se piden una sola vez por consulta, como un DataLoader simple.
- **Encuestas por canal.** Polls no tiene un endpoint para listar encuestas. Cuando se crea una, polls la anuncia en el canal con un mensaje que incluye `Poll ID: <id>`. `listPolls` lee los mensajes del canal, extrae los IDs y consulta cada encuesta en polls.
- **Lista de usuarios.** users no tiene un endpoint para listar. `listUsers` usa sus eventos públicos `chat.user.created` (`GET /api/v1/events`).
- **Archivos.** Los archivos viajan en base64 dentro de la mutation de GraphQL. Las imágenes y descargas también pasan por el gateway (`/files/...`), así el navegador nunca habla directo con los microservicios.
- **Identidad para media.** Media exige el header `X-User-Id`. El gateway lo agrega con el usuario elegido en la interfaz.
- **Fallos parciales.** Si un servicio se cae, solo falla la parte de la pantalla que lo usa. Por ejemplo, si cae profiles, los mensajes se siguen viendo, pero sin foto.

## Limitaciones conocidas

- El chat base no tiene autenticación. El "usuario actual" se elige en un selector, sin login, igual que en los otros equipos.
- Los eventos de users se guardan en memoria. Si se reinicia el contenedor `users`, la lista del selector queda vacía (los usuarios siguen existiendo). Basta con crear un usuario nuevo.
- Polls no permite saber si un usuario ya votó. Si vota dos veces, la interfaz muestra el error que devuelve polls.

## Declaración de uso de IA

Se usó Claude (Anthropic) como asistente para escribir el API Gateway, la interfaz web, el `docker-compose.yaml` y este README, y para diagnosticar errores al levantar el sistema. El grupo definió el alcance, los requisitos, eligió los servicios de otros equipos a integrar, revisó, ejecutó y verificó el sistema en local, y grabó el video de demostración.
