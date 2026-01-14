# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## POS notification sound

The POS plays a sound when NEW orders are detected in:

- Ready Orders (kitchen queue: `received` / `preparing` / `ready`)
- Pending Orders (orders with `status=pending` and `paymentMethod=pending`)
- Dine/Take-outs (orders awaiting payment verification)

Place the audio file here:

- `public/sounds/notification.mp3`

It is referenced at runtime as:

- `/sounds/notification.mp3`
