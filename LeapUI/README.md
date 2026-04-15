# LeapUI

Uma extensão JavaScript que simula a funcionalidade de seleção de elementos do DevTools do navegador. Pressione **Alt+I** em qualquer site para ativar o modo de seleção e ver elementos destacados com borda vermelha conforme você passa o mouse.

## 🚀 Funcionalidades

- **Seleção Visual**: Destaca elementos com borda vermelha ao passar o mouse
- **Atalho Rápido**: Alt+I para ativar/desativar em qualquer página
- **Menu de Ações**: Click em elemento mostra menu com opções
- **Edição Inline**: Edite texto de elementos diretamente na página
- **Duplicar Elementos**: Clone e reposicione elementos arrastando
- **Copiar Seletor**: Gera seletores CSS únicos automaticamente
- **Informações Detalhadas**: Log completo do elemento no console do navegador
- **Interface Limpa**: Overlay com informações do elemento em tempo real
- **Escape Fácil**: ESC para sair do modo de seleção

## 📦 Instalação

### Método 1: Carregar Extensão não-empacotada (Desenvolvimento)

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" no canto superior direito
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `leap-ui`
5. A extensão será instalada e aparecerá na barra de ferramentas

### Método 2: Empacotamento (Produção)

1. Vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor"
3. Clique em "Compactar extensão"
4. Selecione a pasta `leap-ui`
5. Execute o arquivo `.crx` gerado

## 🎯 Como Usar

### Ativação
- **Alt + I**: Ativa/desativa o modo de seleção
- **Clique no ícone**: Abre o painel de controle
- **ESC**: Sai do modo de seleção

### No modo ativo
1. **Hover**: Passe o mouse sobre elementos para destacá-los
2. **Click**: Clique em um elemento para abrir menu de ações:
   - 📋 **Copiar Seletor**: Copia seletor CSS para área de transferência
   - ✏️ **Editar Texto**: Permite edição inline do conteúdo (Enter salva, ESC cancela)
   - 📄 **Duplicar Elemento**: Cria cópia que pode ser arrastada para reposicionamento
   - 🔍 **Inspecionar**: Mostra informações detalhadas no console

### Informações mostradas
- Tag do elemento
- ID (se existir)
- Classes CSS
- Seletor CSS único
- Atributos
- Conteúdo de texto (truncado)
- Menu interativo com ações

### Edição de Texto
- Clique em "Editar Texto" no menu
- O elemento fica editável diretamente
- **Enter**: Salva as alterações
- **ESC**: Cancela a edição
- Auto-salva ao clicar fora

### Duplicação de Elementos
- Clique em "Duplicar Elemento" no menu
- Uma cópia aparece destacada
- Arraste a cópia para reposicioná-la
- IDs são removidos para evitar conflitos

## 🛠️ Estrutura do Projeto

```
leap-ui/
├── manifest.json          # Configuração da extensão
├── content.js             # Script principal injetado nas páginas
├── background.js          # Service worker (Manifest V3)
├── popup.html             # Interface do popup
├── popup.js               # Lógica do popup
├── styles.css             # Estilos da extensão
└── README.md             # Este arquivo
```

## ⚙️ Arquitetura Técnica

### Content Script (`content.js`)
- Classe `LeapUISelector` principal
- Event listeners para teclado, mouse e arrastar
- Sistema de highlight com CSS personalizado
- Menu de contexto interativo
- Edição inline de texto
- Duplicação e arraste de elementos
- Gerador de seletores CSS únicos
- Sistema de notificações não-obstrutivas

### Service Worker (`background.js`)
- Gerenciamento de estado da extensão
- Comunicação entre componentes
- Logs de instalação

### Popup (`popup.html` + `popup.js`)
- Interface de controle visual
- Status da extensão em tempo real
- Botão de ativação/desativação
- Instruções de uso

## 🔧 Personalização

### Modificar a cor da borda
Edite `styles.css`, linha com `border: 2px solid #ff0000`:
```css
.leap-ui-highlighted::before {
    border: 2px solid #00ff00 !important; /* Verde em vez de vermelho */
}
```

### Alterar o atalho de teclado
Edite `content.js`, método `handleKeyDown`:
```javascript
// Mudar de Alt+I para Ctrl+Shift+S
if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
    event.preventDefault();
    this.toggle();
}
```

### Personalizar informações do overlay
Edite `content.js`, método `updateOverlay`:
```javascript
// Adicionar mais informações
let displayText = `<${tagName}${id}${classes}> - ${element.offsetWidth}x${element.offsetHeight}px`;
```

## 🐛 Solução de Problemas

### A extensão não funciona
1. Verifique se está ativada em `chrome://extensions/`
2. Recarregue a página onde está testando
3. Verifique o console para erros

### Alt+I não funciona
1. Verifique se não há conflitos com outros atalhos
2. Teste em uma página simples (não chrome://)
3. Clique no ícone da extensão como alternativa

### Elementos não são destacados
1. Verifique se o modo está ativo (cursor muda para crosshair)
2. Alguns elementos podem ter z-index muito alto
3. Tente em outra página para isolar o problema

## 📜 Permissões

A extensão requer apenas:
- **activeTab**: Para injetar scripts na aba ativa
- **Não requer**: Histórico, cookies, dados pessoais, etc.

## 🏗️ Desenvolvimento

### Estrutura do código
- **Manifest V3**: Compatível com Chrome moderno
- **Vanilla JS**: Sem dependências externas
- **CSS puro**: Estilos sem frameworks
- **Event-driven**: Arquitetura baseada em eventos

### Debug
1. Console da extensão: `chrome://extensions/` > DevTools
2. Console da página: F12 > Console
3. Background: `chrome://extensions/` > "service worker"

## 📄 Licença

Este projeto é de código aberto. Sinta-se livre para usar, modificar e distribuir.

## 🤝 Contribuições

Contribuições são bem-vindas! Áreas para melhorias:
- Support para Firefox/Edge
- Mais opções de customização
- Exportação de elementos selecionados
- Integração com ferramentas de design

## 📞 Suporte

Para reportar bugs ou solicitar funcionalidades, abra uma issue no repositório do projeto.

---

**Desenvolvido com ❤️ para facilitar a vida dos desenvolvedores web**