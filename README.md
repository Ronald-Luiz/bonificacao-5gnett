# 5GNETT — React + Vite

Projeto convertido do HTML/CSS/JavaScript original para uma aplicação React usando Vite.

## Estrutura

- `src/App.jsx` — monta a interface no React.
- `src/legacy.js` — lógica original de atendimentos, Supabase, gerência, relatórios e bonificação.
- `src/style.css` — estilos originais, com o caminho da imagem ajustado.
- `src/main.jsx` — entrada do React.
- `public/fundo-5gnett.jpg` — imagem de fundo.
- `vite.config.js` — configuração do Vite.

## Executar

```bash
npm install
npm run dev
```

Depois abra o endereço mostrado pelo Vite.

## Gerar versão de produção

```bash
npm run build
npm run preview
```

A conexão existente com o Supabase foi preservada na conversão.
