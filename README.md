# Biblioteca CRUD

## Descripción

Aplicación web para administrar un catálogo de libros mediante operaciones CRUD completas. El backend expone una API REST sobre Django y MySQL, con validaciones duplicadas en servidor y cliente, protección frente a patrones peligrosos en texto, creación idempotente coordinada con cerrojos de MySQL y endurecimiento HTTP básico habilitado desde Django.

## Tecnologías utilizadas

- Backend: Python 3, Django 4.2, Django REST Framework, PyMySQL, python-dotenv.
- Base de datos: MySQL 8 (utf8mb4, modo estricto recomendado).
- Frontend: React 18, Vite 5, CSS responsivo sin frameworks de componentes externos.
- Herramientas: npm para el frontend, migraciones de Django para el esquema relacional.

## Funcionalidades

- Registrar libros nuevos con los campos obligatorios título, autor, año y género.
- Listar todos los registros ordenados por fecha de actualización.
- Editar registros existentes mediante actualización parcial.
- Eliminar registros con confirmación explícita en la interfaz.
- Cabecera obligatoria `Idempotency-Key` en creaciones para ignorar reintentos duplicados que comparten la misma clave y devolver el mismo recurso sin repetir la inserción.
- Limitación de ritmo anónima configurable para absorber picos de tráfico legítimos sin tumbar el proceso de forma inmediata.

## Seguridad y escalabilidad

- Consultas a base de datos exclusivamente a través del ORM de Django para minimizar riesgo de inyección SQL.
- Validación de entrada en serializadores DRF y en el modelo (`full_clean`), más saneamiento de patrones XML peligrosos en texto libre.
- Restricciones en base de datos: clave única de idempotencia, integridad referencial en cascada entre idempotencia y libro, restricción de comprobación sobre el rango del año.
- Cerrojos nombrados `GET_LOCK` / `RELEASE_LOCK` de MySQL alrededor de la creación idempotente para coordinar hilos y procesos concurrentes contra la misma clave.
- Cabeceras recomendadas por Django (`SECURE_BROWSER_XSS_FILTER`, `X_FRAME_OPTIONS`, tipos MIME seguros) activas en configuración.
- Arquitectura stateless en la API salvo la persistencia compartida en MySQL, adecuada para escalar instancias de aplicación detrás de un balanceador siempre que todas compartan la misma base de datos y límites de conexión (`CONN_MAX_AGE` configurable).


## Instrucciones para ejecutar el proyecto

### Atajo con scripts (recomendado en macOS o Linux)

Desde la raíz del repositorio:

```bash
chmod +x setup.sh run.sh
./setup.sh
./run.sh
```

`setup.sh` crea el entorno virtual `.venv`, instala dependencias de Python y de Node, y copia `backend/.env.example` y `frontend/.env.example` a sus respectivos `.env` si aún no existen.

`run.sh` aplica migraciones, inicia Django en segundo plano y deja Vite en primer plano. Variables opcionales: `DJANGO_PORT` (por defecto 8000) y `VITE_PORT` (por defecto 5173). Detener con Ctrl+C cierra ambos procesos.

### Prerrequisitos

- Python 3.9 o superior.
- Node.js 18 o superior y npm.
- Servidor MySQL en funcionamiento.


### Configurar variables de entorno

Copie `backend/.env.example` a `backend/.env` y ajuste credenciales y orígenes CORS.


### Backend

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173` en el navegador.

## Uso de inteligencia artificial

Se utilizó asistencia de IA en Cursor para generar la estructura del repositorio, el código del backend y frontend, las validaciones de seguridad solicitadas, la documentación de este README y una imagen ilustrativa de interfaz
