---
question: Por que não consigo marcar o módulo Administração para uma role?
category: admin
tags: [admin, permissoes, matriz, regras]
---

O módulo **Administração** só pode ser habilitado para a role `manager`. Marcar para `engineer`, `production`, `sales` etc. viola a regra de combinação e a matriz recusa o salvamento (com destaque na célula e sugestão de auto-fix). A role `admin` já tem acesso total por definição — não aparece na matriz. Para delegar tarefas administrativas parcialmente, atribua o papel `manager` ao usuário; para acesso total, `admin` (mantenha o número mínimo — idealmente 2 pessoas).
