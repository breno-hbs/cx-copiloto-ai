# CX Copiloto AI

> **Projeto de portfólio independente.** Simula uma ferramenta interna de Experiência do Cliente (CX) para entregas de comida. Todos os dados são **100% fictícios**. Não tem vínculo com o iFood nem com nenhuma empresa, não acessa sistemas internos de terceiros, não usa logotipos oficiais e não é um canal de suporte real.

## Demonstração

**https://cx-copiloto-ai.vercel.app**

- **Chat do cliente** (`/`): escolha um pedido fictício e use um dos exemplos, ou escreva a sua mensagem.
- **Painel do atendente** (`/agent`): protegido por senha. A senha da demonstração não está neste repositório; peça ao autor.
- **Indicadores** (`/metrics`): conversas, taxa de resolução pela IA, tempos de atendimento e latência.

Os 5 pedidos de teste cobrem os cenários: **PED-1001** atraso, **PED-1002** reembolso, **PED-1003** item faltando, **PED-1004** cobrança duplicada e **PED-1005** alergia.

## O problema

Equipes de atendimento recebem muitas solicitações repetitivas sobre pedidos. Algumas podem ser respondidas na hora com informação verificada; outras exigem análise humana, e o atendente acaba relendo a conversa inteira para entender o caso.

## A solução

O CX Copiloto AI recebe a mensagem do cliente, identifica o motivo do contato, consulta o pedido e:

- **responde sozinho** quando há informação verificada (status de entrega, andamento de reembolso); ou
- **encaminha a um humano** com o contexto preservado: histórico, dados do pedido, intenção, prioridade e o motivo do encaminhamento.

A IA **não executa reembolsos, não cancela pedidos e não inventa decisões**.

## Como funciona

```
Cliente ─► /api/chat ─► 1. Regras determinísticas (saúde/alergia, jurídico, injection) ──► humano (0 chamadas ao LLM)
                         2. Busca do pedido (código, não LLM)
                         3. Agente de Triagem (Gemini, JSON validado por schema)
                         4. Agente de Atendimento (só se elegível; usa apenas pedido + base de conhecimento)
                         5. Validador de saída ──► reprovou? humano
                                    │
                    resposta ao cliente  ou  ticket + webhook
                                    │
                  Painel do atendente: fila por prioridade, contexto, assumir, encerrar
```

- **Máximo de 2 chamadas ao LLM por mensagem.** Casos sensíveis custam 0 chamadas.
- **Triagem** classifica intenção, urgência e necessidade de humano. Não escreve ao cliente.
- **Atendimento** só roda para atraso e acompanhamento de reembolso, e só pode usar o pedido e os artigos da base de conhecimento.
- **Qualquer falha, dúvida ou política escala para humano**: erro do LLM, timeout, baixa confiança, resposta reprovada.

### Segurança e prevenção de respostas inventadas

- A IA tem acesso **somente leitura** ao pedido. Não existe nenhuma ferramenta de escrita.
- Saúde/alergia, ameaça jurídica e tentativas de manipular as instruções são tratadas por **regras fixas**, antes de qualquer LLM.
- Reembolso a executar, cobrança duplicada e item faltando **sempre** vão para um humano.
- O **validador** bloqueia: promessas ("vou reembolsar", "garantimos"), valores em R$ que não constam no pedido, artigos de base de conhecimento inexistentes ou de outra intenção, e contradição do status de reembolso.
- O texto do cliente é tratado como **dado não confiável** nos prompts.
- Limite de tamanho da mensagem, limite por IP, **teto diário de chamadas ao LLM** e login do atendente por senha.
- As chaves ficam **apenas no servidor** (variáveis de ambiente). O banco só aceita acesso pela chave de servidor, com RLS ativo.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Google Gemini · Vitest · Vercel · Make (webhook).

## Páginas

| Rota | Função |
|---|---|
| `/` | Chat do cliente (escolhe um pedido fictício) |
| `/agent` | Painel do atendente (fila, contexto, assumir e encerrar) |
| `/metrics` | Indicadores de atendimento |

## Rodando localmente

1. Crie um projeto no Supabase e rode `supabase/schema.sql` e depois `supabase/seed.sql` no SQL Editor.
2. Crie uma chave do Gemini no Google AI Studio.
3. Copie `.env.example` para `.env.local` e preencha. **Nunca commite o `.env.local`.**
4. ```bash
   npm install
   npm run dev
   ```

## Testes e avaliação

```bash
npm test        # testes unitários do orquestrador e do validador (sem chamar a API)
npm run eval    # 30 casos contra o Gemini real; gera eval/results.md
```

## Resultados

Avaliação com 30 mensagens fictícias contra o Gemini real (`gemini-3.5-flash-lite`), cobrindo os 5 cenários e 7 casos adversariais. Relatório completo, caso a caso, em [`eval/results.md`](eval/results.md).

| Métrica | Resultado | Critério |
|---|---|---|
| Decisão correta (responder × escalar) | 96,7% (29/30) | ≥ 90% |
| Intenção correta | 100% | ≥ 90% |
| Saúde/alergia escalada com prioridade crítica | 100% (5/5) | 100% |
| Casos adversariais escalados (injection, cancelamento, ameaça, fora do escopo) | 100% (7/7) | 100% |
| Respostas automáticas indevidas | 0 | 0 |
| Latência média / p95 | 1,6 s / 4,2 s | p95 < 8 s |

**Falha encontrada:** em 1 caso de atraso a triagem pediu humano por precaução (o cliente perguntou onde estava o pedido, informação que o sistema não tem). É um erro conservador: a IA deixou de responder, não respondeu errado.

**Ajuste feito após a avaliação:** as respostas mostravam o horário em UTC. As datas agora vão ao modelo já em horário de Brasília. Essa correção foi validada com uma chamada manual e não faz parte da rodada de 30 casos.

## Limitações

- Demonstração com 5 pedidos fictícios e uma base de conhecimento pequena, sem RAG.
- O plano gratuito do Gemini tem limite de requisições por minuto; quando a IA fica indisponível, **tudo é encaminhado a um humano** em vez de arriscar uma resposta.
- O limite por IP é em memória (melhor esforço em ambiente serverless).
- O acesso do atendente usa uma senha única de demonstração, não um sistema de usuários.

## Aviso

Projeto educacional e de portfólio. Os nomes, pedidos e valores são inventados. Qualquer semelhança com pessoas, pedidos ou empresas reais é coincidência.
