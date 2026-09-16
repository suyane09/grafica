# Gestão de Produção - Gráfica (Demonstração)

Versão de demonstração do painel. Projeto React + Vite + Tailwind CSS,
**sem login e sem banco de dados**: qualquer pessoa que abrir o endereço já
entra direto no painel.

Os dados ficam guardados apenas no navegador de quem está usando
(`localStorage`). Isso significa que cada pessoa vê os seus próprios dados de
teste, nada é compartilhado e nada vai para a nuvem. Limpar os dados do
navegador apaga tudo.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (geralmente `http://localhost:5173`).

## Hospedar

Serve em qualquer hospedagem de site estático (Vercel, Netlify, Cloudflare
Pages, GitHub Pages):

1. Suba o projeto para um repositório no GitHub.
2. Importe o repositório na plataforma escolhida.
3. Build command: `npm run build` — pasta de saída: `dist`.

Não há variáveis de ambiente para configurar.

## Personalizar

Em **Configurações**, dentro do próprio painel, dá para alterar o nome da
gráfica, responsável, telefone, e-mail e endereço que aparecem na Ordem de
Serviço. Por padrão vem só "Gráfica", sem nenhum dado preenchido.

## Estrutura

- `src/App.jsx` — componente principal do dashboard (todo o app)
- `src/main.jsx` — ponto de entrada do React
- `src/index.css` — diretivas do Tailwind CSS
- `tailwind.config.js` / `postcss.config.js` — configuração do Tailwind
- `vite.config.js` — configuração do Vite

## Dependências principais

- `react` / `react-dom`
- `recharts` (gráficos)
- `lucide-react` (ícones)
- `tailwindcss` (estilos)
