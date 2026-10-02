# Forward Access — sitio web renovado

Sitio estático (HTML + CSS + JS). No necesita compilación ni base de datos.

## Estructura

```
forward/
├── index.html            Inicio
├── eventos.html          Nuestros clientes (55 eventos, con buscador)
├── productores.html      Productores y promotores
├── cotizacion.html       Formulario de cotización
├── eventos-next.html     Redirige a eventos.html (enlace antiguo)
├── eventos-next-3.html   Redirige a eventos.html (enlace antiguo)
└── assets/
    ├── css/styles.css    Estilos (colores y tipografía en :root)
    ├── js/main.js        Animaciones, slider, video, buscador y formularios
    ├── img/              Imágenes (brand/ = logos, eventos/, productores/)
    └── vendor/           GSAP + ScrollTrigger + SplitText y Lenis (copias locales)
```

## Publicar

Sube todo el contenido de la carpeta `forward/` a la raíz del hosting de forward.do,
reemplazando los archivos actuales. Las rutas son relativas, así que funciona en cualquier carpeta.

> El video de YouTube no se reproduce si abres el `index.html` con doble clic
> (`file://`). En el servidor sí funciona. Para probarlo localmente:
> `python -m http.server` dentro de la carpeta y abre http://localhost:8000

## Formularios (cotización y suscripción)

Por defecto, al enviar se abre el correo del visitante con el mensaje ya redactado
para **forwardaccesssrl@gmail.com**. Si quieres que lleguen directo sin abrir el correo,
crea un formulario gratuito en [Formspree](https://formspree.io) (o usa un PHP propio)
y pega la URL en `assets/js/main.js`:

```js
formEndpoint: 'https://formspree.io/f/TU_CODIGO'
```

## Cambios habituales

- **Agregar un evento:** copia un bloque `<article class="event-card">` en `eventos.html`,
  cambia la imagen y el nombre (en `data-title`, `alt` y el `<h3>`).
  La imagen va cuadrada en WebP: 600×600 en `assets/img/eventos/N.webp` y una copia de
  360×360 en `assets/img/eventos/sm/N.webp` (la usa el muro animado de las cabeceras).
  Si solo tienes el afiche pequeño (300×300 de TuBoleta), reescálalo antes con una herramienta
  de IA (por ejemplo Real-ESRGAN / Upscayl) para que se vea nítido.
- **Colores:** variables `--blue`, `--cyan` y `--grad` (marca) y `--ink-950` / `--ink-900`
  (azul marino de las secciones oscuras y el footer) al inicio de `styles.css`.
- **Teléfono / WhatsApp:** el sitio original lo tenía oculto, por eso no aparece.
