---
question: Como descubro quem alterou uma permissão ou papel?
category: admin
tags: [admin, auditoria, audit-log, investigacao]
---

Em `/admin/auditoria` filtre por **tabela** = `role_module_permissions` (ou `user_roles` para vínculo user×role) e pelo período desejado. Cada linha mostra autor (`user_email`), timestamp, ação (INSERT/UPDATE/DELETE), campo alterado e os valores **antes** (`old_value`) e **depois** (`new_value`). Concessão/remoção de papel (`user_roles`) e aprovação de ordem de compra (`ordens_compra`) também entram na trilha. A trilha é imutável — nem `admin` consegue editar ou apagar linhas pela interface. Se precisar reverter, refaça a operação pela matriz; a reversão também será auditada.
