# Feature Specification: Compartilhamento de Tela entre Amigos (app desktop)

**Feature Branch**: `001-screen-share-app`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Alternativa ao compartilhamento de tela do Discord: app desktop portable para Windows, sem login, onde se cria uma sala, compartilha-se o código e os amigos entram para assistir a tela com o áudio do computador. Backend self-hosted."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar sala e transmitir a tela com áudio (Priority: P1)

Uma pessoa abre o app, cria uma sala e recebe um código. Escolhe qual tela compartilhar e começa a transmitir; o som do computador (jogo, música, navegador) vai junto com a imagem.

**Why this priority**: É o núcleo do produto e o motivo de existir: substituir o compartilhamento de tela que o Discord desativou.

**Independent Test**: Abrir o app, criar uma sala, ver o código, iniciar a transmissão de uma tela e confirmar que a transmissão está ativa e o código pode ser copiado.

**Acceptance Scenarios**:

1. **Given** o app aberto e o serviço disponível, **When** a pessoa informa um nome de exibição e cria uma sala, **Then** a sala é criada e um código aleatório é exibido, com opção de copiá-lo.
2. **Given** o usuário dentro de uma sala, **When** escolhe uma tela inteira e inicia a transmissão, **Then** a imagem e o áudio do computador passam a ser transmitidos aos presentes.
3. **Given** uma transmissão ativa, **When** o transmissor encerra o compartilhamento, **Then** os espectadores veem que a transmissão terminou e a sala continua existindo.
4. **Given** uma transmissão ativa, **When** o transmissor escolhe a predefinição de qualidade "movimento" ou "detalhe", **Then** a transmissão prioriza, respectivamente, a fluidez ou a nitidez.

---

### User Story 2 - Entrar em uma sala e assistir (Priority: P1)

Um amigo recebe o código, cola no app, entra na sala e assiste à transmissão com imagem e áudio, com controles básicos de visualização.

**Why this priority**: Sem espectadores a transmissão não tem valor; juntas, as histórias 1 e 2 formam o MVP.

**Independent Test**: Com uma transmissão ativa, outra pessoa entra com o código e vê imagem e ouve o áudio, ajustando volume, silêncio e tela cheia.

**Acceptance Scenarios**:

1. **Given** um código válido de uma sala com transmissão ativa, **When** o amigo informa seu nome e cola o código, **Then** entra na sala e passa a ver e ouvir a transmissão.
2. **Given** um código inexistente, expirado ou malformado, **When** o amigo tenta entrar, **Then** vê uma mensagem clara de erro e pode tentar de novo.
3. **Given** o espectador assistindo, **When** ajusta o volume, silencia ou ativa tela cheia, **Then** o controle surte efeito imediato, sem afetar os demais espectadores.
4. **Given** uma sala com vários espectadores (até 10), **When** todos assistem ao mesmo tempo, **Then** todos recebem a transmissão com qualidade comparável.
5. **Given** um espectador dentro da sala sem transmissão ativa, **When** o transmissor inicia, **Then** a imagem aparece automaticamente.

---

### User Story 3 - Obter o app e ser avisado de novas versões (Priority: P2)

Um amigo baixa um único arquivo executável, abre sem instalar nem precisar de administrador. Quando existe versão mais nova, o app avisa e indica onde baixá-la.

**Why this priority**: Sem distribuição simples os amigos não chegam ao app, mas o fluxo pode ser validado depois do núcleo.

**Independent Test**: Em um Windows limpo, baixar e abrir o arquivo; publicar uma versão mais nova e confirmar que o app antigo exibe o aviso com o link de download.

**Acceptance Scenarios**:

1. **Given** um Windows 10 ou 11 sem o app, **When** o usuário baixa e executa o arquivo, **Then** o app abre sem instalação e sem privilégios de administrador.
2. **Given** o app em versão antiga e uma versão mais nova publicada, **When** o app é aberto, **Then** exibe um aviso de atualização com link para o download.
3. **Given** o app na versão atual, **When** é aberto, **Then** nenhum aviso de atualização aparece.
4. **Given** o serviço de versão indisponível, **When** o app é aberto, **Then** funciona normalmente, sem erro visível.

---

### User Story 4 - Voz, lista de participantes e acabamento (Priority: P3)

Os participantes veem quem está na sala e quem está falando, podem usar o microfone (com push-to-talk), e o app se recupera de quedas de conexão. O criador pode proteger a sala com senha, limitar participantes e definir expiração.

**Why this priority**: Melhora a experiência e a robustez, mas o produto já é útil sem isso (voz pode continuar no Discord).

**Independent Test**: Com várias pessoas na sala, ver a lista e o indicador de fala; derrubar a rede de um participante e ver a reconexão automática; criar sala com senha e testar entrada com senha errada e correta.

**Acceptance Scenarios**:

1. **Given** participantes na sala, **When** alguém entra ou sai, **Then** a lista de participantes é atualizada para todos.
2. **Given** o microfone habilitado, **When** o usuário mantém a tecla de push-to-talk, **Then** os demais ouvem e veem o indicador de quem fala.
3. **Given** uma queda temporária de conexão, **When** a rede volta, **Then** o app reconecta sozinho à mesma sala.
4. **Given** uma sala com senha, **When** alguém entra sem a senha correta, **Then** a entrada é recusada.
5. **Given** uma sala com limite de participantes atingido ou expirada, **When** alguém tenta entrar, **Then** a entrada é recusada com mensagem explicando o motivo.

---

### Edge Cases

- Dois ou mais participantes tentam transmitir ao mesmo tempo na mesma sala (comportamento definido nas premissas).
- O transmissor fecha o app ou perde a conexão no meio da transmissão: os espectadores devem ser informados.
- Conexão em rede restritiva (firewall corporativo, rede móvel) que bloqueia tráfego direto.
- A voz dos amigos ou o som do próprio app volta na transmissão (eco), pois o áudio do sistema é capturado por inteiro.
- Compartilhamento de uma única janela: sai sem áudio.
- Banda do servidor insuficiente com muitos espectadores: a qualidade degrada em vez de a transmissão cair.
- O monitor compartilhado é desconectado ou muda de resolução durante a transmissão.
- Usuário digita o código com espaços ou diferença de maiúsculas/minúsculas.
- O aviso de segurança do Windows (app não reconhecido) aparece ao abrir o arquivo pela primeira vez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir criar uma sala sem cadastro ou login, informando apenas um nome de exibição.
- **FR-002**: O sistema MUST gerar para cada sala um código aleatório, longo o bastante para não ser adivinhado por tentativa.
- **FR-003**: O sistema MUST permitir entrar em uma sala colando ou digitando o código no app, tolerando espaços e diferença de maiúsculas/minúsculas.
- **FR-004**: O sistema MUST recusar, com mensagem clara, códigos inexistentes, expirados ou de salas lotadas.
- **FR-005**: O acesso à sala MUST ser concedido por credencial temporária, que expira em curto prazo e não pode ser reutilizada indefinidamente.
- **FR-006**: O sistema MUST permitir ao usuário escolher qual tela inteira compartilhar, por um seletor próprio com pré-visualização.
- **FR-007**: O sistema MUST transmitir, junto com a imagem da tela inteira, o áudio do sistema (jogo, música, navegador).
- **FR-008**: O sistema MUST permitir compartilhar uma janela individual apenas com vídeo, avisando que sem áudio.
- **FR-009**: A qualidade padrão MUST ser de 720p a 40 quadros por segundo.
- **FR-010**: O sistema MUST oferecer as predefinições "movimento" (mantém a fluidez) e "detalhe" (mantém a resolução).
- **FR-011**: Cada sala MUST suportar de 2 a 10 pessoas simultâneas, com um transmissor e os demais como espectadores.
- **FR-012**: O espectador MUST poder silenciar, ajustar volume e usar tela cheia, localmente.
- **FR-013**: O sistema MUST informar os presentes quando a transmissão começa, termina ou é interrompida.
- **FR-014**: O sistema MUST avisar que, ao transmitir, o áudio do sistema inclui a voz de outros participantes e recomendar o uso de fone de ouvido e voz desligada durante a transmissão.
- **FR-015**: O app MUST ser distribuído como um único executável que roda sem instalação e sem privilégios de administrador, em Windows 10 e 11.
- **FR-016**: O app MUST consultar a versão mais recente disponível e avisar o usuário, com link de download, quando houver versão nova; falha nessa consulta não deve atrapalhar o uso.
- **FR-017**: O executável MUST estar disponível para download em local acessível aos amigos, acompanhado de instrução sobre o aviso de segurança do Windows para apps não assinados.
- **FR-018**: O sistema MUST funcionar mesmo quando a rede do usuário bloqueia conexões diretas (firewall, NAT restritivo, rede móvel).
- **FR-019**: O sistema MUST mostrar a lista de participantes da sala e indicar quem está falando (histórias de voz).
- **FR-020**: O sistema MUST permitir microfone opcional com push-to-talk.
- **FR-021**: O app MUST tentar reconectar automaticamente após queda de rede e mostrar mensagens de erro compreensíveis.
- **FR-022**: O criador da sala MUST poder definir senha opcional, limite de participantes e tempo de expiração.
- **FR-023**: O app MUST exibir métricas básicas de conexão (taxa de bits, perda de pacotes, latência) para diagnóstico.
- **FR-024**: O serviço MUST limitar a taxa de requisições para evitar abuso e MUST NOT registrar em logs dados sensíveis (códigos completos, credenciais).
- **FR-025**: O operador MUST poder implantar o serviço em um único servidor próprio e acompanhar seu estado por monitoramento básico.

### Key Entities

- **Sala**: espaço temporário identificado por um código aleatório; tem criador, estado (ativa, expirada), limite opcional de participantes, senha opcional e prazo de expiração.
- **Participante**: pessoa presente na sala, com nome de exibição, papel (transmissor ou espectador) e estado (microfone, falando).
- **Transmissão**: fluxo de imagem e áudio de uma tela, com predefinição de qualidade e estado (ativa, encerrada).
- **Credencial de acesso**: permissão temporária que habilita um participante a entrar em uma sala específica, com validade curta.
- **Versão do app**: número da versão mais recente publicada e link de download.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário novo cria uma sala e inicia a transmissão em menos de 1 minuto após abrir o app.
- **SC-002**: Um amigo com o código entra na sala e vê a transmissão em menos de 15 segundos.
- **SC-003**: A diferença entre o que acontece na tela transmitida e o que o espectador vê é menor que 1 segundo em condições normais de rede.
- **SC-004**: Com 10 espectadores simultâneos, 95% deles assistem em 720p com fluidez próxima de 40 quadros por segundo durante 30 minutos sem interrupção.
- **SC-005**: O áudio do sistema chega aos espectadores sincronizado com a imagem, sem diferença perceptível, em todas as transmissões de tela inteira testadas.
- **SC-006**: 90% dos amigos conseguem baixar, abrir e entrar em uma sala na primeira tentativa, sem ajuda, seguindo apenas a instrução fornecida.
- **SC-007**: A conexão é estabelecida com sucesso em redes domésticas e em rede móvel em pelo menos 95% das tentativas.
- **SC-008**: Após uma queda de rede de até 30 segundos, o participante volta à sala automaticamente em pelo menos 90% dos casos.
- **SC-009**: Nenhuma sala é acessada por quem não possui o código, em testes de tentativa de adivinhação de códigos.
- **SC-010**: O aviso de nova versão aparece em 100% das aberturas do app desatualizado com o serviço disponível.

## Assumptions

- Todos os participantes usam o app (o mesmo executável); não há visualizador web nem outras plataformas (macOS, Linux) no escopo.
- Windows 10 e 11 são suportados; a versão mínima de build para capturar áudio excluindo o próprio app será confirmada em prova de conceito.
- Em cada sala há um transmissor por vez; tentativas simultâneas de transmitir são tratadas com aviso, sem derrubar a transmissão atual.
- O público é um grupo pequeno de amigos; não há requisito de escala massiva, moderação nem histórico de conversas.
- O aviso de segurança do Windows para apps sem assinatura é aceito pelo grupo; assinatura de código está fora do escopo.
- Não há atualização automática: a nova versão é baixada manualmente.
- Salas são temporárias e não armazenam gravações da transmissão.
- No MVP, a prevenção do eco é feita por orientação (fone, voz desligada); a exclusão automática do áudio do próprio app é um aprimoramento posterior, sujeito a validação técnica.
- Compartilhamento de áudio de janela individual está fora do MVP.
- A hospedagem é própria, em um único servidor com banda de saída suficiente (≈ 4 Mbps por espectador); o orçamento mensal ainda será definido e não altera o escopo funcional.
- As histórias 1 e 2 formam o MVP; a história 3 viabiliza a distribuição; a história 4 é acabamento posterior.
