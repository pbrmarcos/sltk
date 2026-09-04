---
question: Posso mudar o texto dos e-mails que o sistema envia?
category: admin
tags: [admin, email, template, variaveis]
---

Sim. Em `/admin/emails` → aba **Eventos**, clique em **Editar** no evento desejado e ajuste assunto e corpo. As **variáveis disponíveis** (ex.: `{{cliente}}`, `{{codigo}}`) aparecem ao lado e são preenchidas no envio; variáveis marcadas como obrigatórias bloqueiam o disparo se vierem vazias. Use a **Prévia** antes de salvar. A alteração vale apenas para envios futuros — nada é reenviado.
