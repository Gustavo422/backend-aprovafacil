# ADR 0002 — Ownership e convenções de commit para contratos

Status: Accepted

## Ownership
- Módulo `simulados`: Squad Simulados (BE owner: backend/modules/simulados; FE owner: frontend/features/simulados)
- Alterações de contrato exigem revisão cruzada (BE+FE)

## Convenções de commit
- chore(openapi): ajustes não-funcionais de documentação
- docs(simulados): atualiza README/ADR
- feat(simulados)!: mudança de contrato com breaking change (v2)
- fix(simulados): correção no contrato sem breaking change

## Processo
1. Validar schema no Supabase
2. Atualizar repositórios/DTOs/serviços
3. Atualizar OpenAPI e rodar `contracts:test`
4. Abrir PR com descrição do impacto e plano de rollout

