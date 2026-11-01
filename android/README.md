# PetFlow Cliente para Android

O APK do cliente abre com o logo original PetFlow centralizado sobre fundo verde `#045A54`, inclusive no modo escuro. O logo permanece visível durante o primeiro carregamento, por pelo menos 800 ms, até o login ter um quadro pronto para exibição. As barras do sistema e a tela de conexão seguem essa cor. O login tem fundo claro, campos arredondados e acesso por e-mail e senha. Compatível com Android 8 ou superior. Este projeto Android não inclui um aplicativo administrativo separado.

A abertura desenha fundo e logo no mesmo quadro, desde o tema da janela até a tela nativa de carregamento. A navegação do APK tem quatro atalhos fixos: Início, Categorias, Pedidos e Conta. O cliente tem um avatar com sua inicial e nome; “Sair da conta” fica dentro da página da conta. A barra reserva espaço na página e usa ícones locais, sem depender de fonte externa.

## Instalar

Copie `dist/PetFlow-Android.apk` para o celular e abra o arquivo. Autorize a instalação pelo aplicativo usado para abrir o APK quando o Android solicitar. Esta versão é assinada com uma chave local de desenvolvimento e serve para instalação direta; publicação na Play Store exige uma chave de distribuição própria.

## O que fica no aplicativo

O login, a navegação Android e o script de catálogo adaptado ficam exclusivamente em `android/web/` e são incluídos no APK. O build lê esses arquivos sem modificá-los; a versão web permanece separada. O aplicativo mantém a URL HTTPS real da loja e intercepta apenas uma lista explícita de arquivos locais; as solicitações de autenticação seguem para o servidor com a mesma origem e sessão. As rotas `/login` e `/cadastro` preservam os parâmetros de retorno. Nenhum arquivo `.env`, senha, banco ou chave de provedor entra no APK.

Catálogo, cadastro, recuperação de senha, pedidos e pagamentos precisam de conexão e do servidor em funcionamento em `https://system-petflow-production.up.railway.app`. Mudanças futuras nos arquivos incluídos precisam de um novo APK. As demais páginas acompanham a versão publicada do servidor.

O botão Voltar navega pelo histórico. Links externos de pagamento, e-mail e telefone abrem o aplicativo correspondente. Quando o pagamento é feito no navegador, volte ao PetFlow e consulte o pedido; o aplicativo não captura automaticamente o retorno do navegador. O aplicativo não solicita localização nem rastreia em segundo plano; o rastreamento de entregadores continua sendo um recurso do navegador.

## Gerar novamente

Requisitos: JDK 17 ou superior, Android SDK com plataforma 36+ e Build-Tools. O script usa as ferramentas oficiais já instaladas, sem Gradle ou dependências externas.

```powershell
& .\android\build-apk.ps1
```

Parâmetros opcionais:

```powershell
& .\android\build-apk.ps1 -AppUrl 'https://sua-loja.example' -SdkPath 'C:\Android\Sdk' -JavaHome 'C:\Java\jdk-21'
```

Saídas: `dist/PetFlow-Android.apk` e seu SHA-256. A chave de desenvolvimento é criada em `android/build/petflow-debug.keystore`, ignorada pelo Git. Preserve essa chave para instalar atualizações sobre este mesmo aplicativo; se for apagada, uma nova assinatura exigirá desinstalar a versão anterior e perder a sessão local. Para distribuição pública, adote uma chave de produção guardada pelo responsável pela loja e adapte a etapa de assinatura.

O script verifica a assinatura e o alinhamento do APK. Esses controles não substituem a instalação e o teste em um aparelho Android real.

Referências das ferramentas: [Splash screen](https://developer.android.com/develop/ui/views/launch/splash-screen), [WebViewClient](https://developer.android.com/reference/android/webkit/WebViewClient) e [apksigner](https://developer.android.com/tools/apksigner).
