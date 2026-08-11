# ALVES.AnalisesV8
Sistema web multiusuário de análise de futebol.

Inclui:
- identidade ⚽ 🚩 🟨 🟥
- login/cadastro e aprovação manual
- Admin com painel de acessos
- banco SQLite persistente
- lista das ligas solicitadas
- salvar/substituir CSV por liga
- análise pré-jogo Casa x Fora
- Gols, Escanteios e Cartões com cores e destaque forte
- janela independente de análise AO VIVO
- Casa/Fora live pode representar países diferentes

## Executar
Requer Node.js 20+:
1. `npm install`
2. `npm start`
3. abra `http://localhost:3000`

Admin inicial:
- email: `admin@alvesanalises.local`
- senha: `AlvesAdmin@2026`

Troque a senha/credenciais e SESSION_SECRET antes de publicar na internet.

Football-Data.co.uk é usado como fonte histórica de CSV; ele não é tratado como feed live.
