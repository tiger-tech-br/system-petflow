# PetFlow — privacidade e preparação da operação

Revisão: 30/10/2026. Este material acompanha os recursos técnicos e os textos públicos da instalação. **Não é um certificado de conformidade nem substitui a definição das práticas da empresa e a revisão jurídica aplicável à operação.** Entregar o código não equivale a autorizar uma loja a coletar dados reais.

## Páginas e atendimento disponíveis

| Recurso | Endereço / finalidade |
| --- | --- |
| Central de Privacidade | `/privacidade`: caminhos para revisar dados, abrir solicitações e acessar informações. |
| Política de Privacidade | `/politica-de-privacidade`: finalidades, compartilhamentos, retenção, identificação e direitos. |
| Cookies e armazenamento | `/politica-de-cookies`: uso real de sessão, sacola, preferências e serviços externos. |
| Termos de Uso | `/termos-de-uso`: conta, oferta, pagamentos, entrega e tratamento de cancelamentos/devoluções. |
| Atendimento autenticado | `/atendimento.html`: protocolos de privacidade/consumo e exportação dos dados disponíveis da própria conta. |
| Administração | Módulo Privacidade em `/admin/profissional.html`, com escopo por empresa, análise e registro da resposta. |

Os documentos exibem aviso demonstrativo enquanto os dados públicos do responsável não estiverem configurados. Não substituir os campos faltantes por um CNPJ, endereço ou contato fictício para apresentar aparência de operação regular.

## Identificação e configuração antes de receber dados reais

Preencher e aprovar os dados públicos do controlador: nome ou razão social, CPF/CNPJ aplicável, endereço comercial, contato de privacidade e identificação do responsável pelo canal ou encarregado, quando aplicável. Informar também um meio de atendimento acessível a quem não consegue entrar na conta. As páginas usam os campos `controllerName`, `controllerDocument`, `controllerAddress`, `privacyEmail`, `privacyContact` e `privacyResponsible` da configuração pública de privacidade; segredos e credenciais nunca devem integrar essa resposta.

A versão dos textos é `2026-10-30`, coordenada com `config/privacyPolicy.js` e os registros de ciência/aceite. Antes de alterar os documentos para uma loja, revisar a versão compartilhada, guardar uma cópia da redação publicada e testar o registro dos novos aceites. Não modificar datas antigas de consentimento ou tratar ciência da política como uma autorização genérica para qualquer finalidade.

A identificação do controlador e as informações sobre o tratamento fazem parte da transparência exigida pela [LGPD, especialmente art. 9º](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html). O [Decreto do Comércio Eletrônico](https://www2.camara.leg.br/legin/fed/decret/2013/decreto-7962-15-marco-2013-775557-publicacaooriginal-139266-pe.html) também trata da identificação do fornecedor, clareza da oferta e atendimento ao consumidor.

Variáveis públicas previstas para essa configuração: `LEGAL_CONTROLLER_NAME`, `LEGAL_CONTROLLER_DOCUMENT`, `LEGAL_CONTROLLER_ADDRESS`, `LEGAL_PRIVACY_EMAIL`, `LEGAL_PRIVACY_CONTACT` e `LEGAL_PRIVACY_RESPONSIBLE`. Após conferir os dados e a disponibilidade real do canal, o operador pode definir `LEGAL_PUBLIC_INFORMATION_CONFIRMED=true`; o padrão é `false`. A API `/api/public/privacidade` usa somente a lista de campos públicos e não deve incluir configurações internas. A confirmação dessa configuração não é um certificado jurídico nem aprova as demais condições desta lista.

## Mapear a prática da loja

Registrar o inventário de tratamentos, com finalidade, dados necessários, base legal, acesso autorizado, fornecedor, retenção e responsável. O fato de existir uma coluna no banco não é motivo suficiente para coletar ou conservar um dado.

| Tratamento | Definição necessária da empresa |
| --- | --- |
| Conta e pedidos | Documentar por que CPF, telefone e endereço são necessários em cada etapa. Avaliar coleta progressiva se a loja permitir conta sem compra ou entrega. Nascimento e complemento são opcionais na interface. |
| Pagamento e registros financeiros | Definir registros e obrigações aplicáveis, guarda, conferência e acesso da equipe. O checkout PagBank não autoriza coletar dados de cartão em campos livres. |
| Pets e serviços | Definir quem acessa históricos, por quanto tempo e com qual finalidade. Campos do animal não devem solicitar dados de saúde de pessoas. |
| Atendimento e protocolos | Definir responsáveis, revisão de identidade proporcional e resposta motivada. Evitar pedir documentos integrais quando informações menos invasivas forem suficientes. |
| Newsletter | Escolha específica e separada do cadastro, evidência da inscrição e caminho simples de cancelamento. Não incluir clientes em campanhas automaticamente. |
| Acesso, auditoria e segurança | Definir acesso aos logs, prazo de guarda, proteção, análise de falhas e descarte. Hashes e identificadores técnicos ainda precisam ser avaliados no contexto do tratamento. |
| GPS real | Informar entregadores, limitar acesso à entrega correspondente, justificar retenção e documentar a finalidade das posições. A coleta depende de permissão e página ativa. A demonstração em Londres não coleta GPS. |

As bases legais devem corresponder à finalidade real; consentimento não é a única hipótese da LGPD. A operação deve limitar os dados ao necessário e demonstrar suas escolhas. A [LGPD](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html) é a referência para esse exame; a lista do sistema não substitui a avaliação da empresa.

## Cadastro sem confirmação obrigatória de e-mail

O cadastro solicitado permite entrar com senha sem depender de envio de confirmação. O endereço informado deve continuar marcado como não verificado até haver comprovação apropriada de controle; isso evita confundir ativação de conta com prova de identidade. A recuperação de senha continua dependente do canal de e-mail.

Não liberar, exportar, apagar ou vincular automaticamente dados históricos de outra pessoa apenas porque o texto do e-mail coincide com o informado em uma conta nova. Os recursos de titulares devem respeitar o vínculo da conta e da empresa. Registros de newsletter ligados apenas a e-mail precisam do controle adicional implementado no backend; a existência de uma sessão não é comprovação de controle de uma caixa postal.

## Cookies, armazenamento e terceiros

O inventário da página pública descreve `sessionStorage` para sessão, sacola, favoritos, endereço e tentativas de pedido. Um registro local de leitura do aviso, quando usado, é uma preferência de interface, não consentimento para publicidade. Não há análise de audiência ou pixel publicitário ativo por padrão nesta revisão. Não apresentar uma escolha falsa de “rejeitar rastreadores” se nenhum bloqueio ou rastreador correspondente existir.

Conteúdo externo pode fazer conexões mesmo sem cookies. Revisar fontes, ícones, Google Maps, ViaCEP, Cloudinary, Resend, PagBank, hospedagem e banco. Antes de adicionar análise de audiência ou publicidade, atualizar o inventário, avaliar a base legal e implementar informação e controles coerentes antes da ativação. Referência: [Guia da ANPD sobre cookies e proteção de dados pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file).

Para cada fornecedor, confirmar conta contratada, dados enviados, finalidade, suboperadores, localização, retenção, responsabilidades e condições de segurança. Quando existir transferência internacional, identificar o país e um mecanismo válido, além de disponibilizar informação adequada ao titular. Não assumir que o nome conhecido do fornecedor resolve essa avaliação. Referência: [ANPD — Transferência Internacional de Dados e Resolução nº 19/2024](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados).

## Rotina de direitos e retenção

1. Receber a solicitação sem custo para o titular e confirmar o recebimento. Proteger o acesso ao protocolo e verificar a identidade na medida necessária.
2. Identificar os registros da pessoa e da empresa, a natureza do pedido e a obrigação aplicável. A autenticação na conta não prova que todo registro com e-mail igual pertença ao usuário.
3. Atender de imediato quando cabível. Para confirmação e acesso, distinguir a forma simplificada da declaração completa em até 15 dias prevista no art. 19. Não estender esse prazo como resposta universal a todos os tipos de pedido.
4. Se houver impedimento, explicar o motivo de fato ou de direito. Registrar responsável e resposta no protocolo.
5. Na exclusão/anonimização, examinar necessidade e retenção comercial, clínica, financeira e de atendimento antes de executar. O sistema bloqueia certas ações automáticas quando há histórico; concluir a análise humana continua necessário.
6. Refletir correções e decisões nos sistemas e fornecedores aplicáveis. Definir o ciclo de expiração dos backups, controles de acesso e reaplicação de decisões após eventual restauração.

Referências: [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares) e [perguntas frequentes sobre o atendimento](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes). Os prazos internos de protocolo são metas operacionais e não afastam requisitos legais.

## Segurança, incidentes e continuidade

Manter HTTPS, contas próprias de provedores, segredos fora do código, permissões mínimas, revisão de usuários da equipe, atualização de dependências e monitoramento de falhas. Ensaiar backup e restauração em banco separado, proteger as cópias e definir prazo, retenção e alerta de falha. A recuperação de imagens e das configurações externas também precisa de procedimento.

Definir um plano de incidente com responsável, triagem, preservação de evidências, contenção, análise de risco, avaliação das comunicações cabíveis e registro das medidas. A comunicação não é automática neste projeto. Verificar a regulamentação vigente da ANPD no momento da ocorrência; referência: [regulamentações da ANPD, incluindo Resolução nº 15/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/).

## Consumidor e aceite da implantação

O fluxo e os textos devem respeitar a oferta e os direitos de cancelamento, arrependimento, garantia e atendimento. Um prazo curto do cancelamento automático ou uma entrega em rota não pode ser anunciado como perda de direito legal. No arrependimento de contratação à distância, observar o prazo legal e a restituição prevista; referências: [CDC compilado](https://www2.camara.leg.br/legin/fed/lei/1990/lei-8078-11-setembro-1990-365086-normaatualizada-pl.html) e [orientação da Senacon](https://www.gov.br/mj/pt-br/assuntos/noticias/dia-dos-pais-conheca-os-direitos-do-consumidor-na-compra-de-presentes).

Antes de abrir a instalação ao público, registrar evidência de:

- Identificação e canais públicos verdadeiros, atualizados e atendidos pela empresa.
- Texto e versão aprovados, coleta de dados justificada e matriz de finalidades/bases/retenção definida.
- Contratos e transferências de fornecedores avaliados, com acessos temporários do implantador encerrados conforme combinado.
- Cadastro e login sem confirmação obrigatória, recuperação protegida e inexistência de inscrição automática em publicidade.
- Solicitação e exportação da própria conta, negação a acesso de terceiros e tratamento motivado de retenção/exclusão.
- Fluxo de cancelamento/devolução acompanhado, suporte treinado, backup restaurável e plano de incidente testado.
- Revisão dos documentos e da operação pelo responsável da loja e pelo assessor jurídico adequado ao caso.

Todos esses itens exigem comprovação na instalação do comprador. Nenhuma caixa desta lista é declarada aprovada apenas pela presença destes arquivos ou de testes automatizados.
