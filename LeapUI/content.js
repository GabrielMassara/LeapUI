// LeapUI - Content Script
class LeapUISelector {
    constructor() {
        this.isActive = false;
        this.currentElement = null;
        this.originalOutline = null;
        this.originalCursor = null;
        this.overlay = null;
        this.contextMenu = null;
        this.navbar = null;
        this.isEditing = false;
        this.selectedForMovement = null; // Elemento selecionado para movimento com setas
        this.moveMode = false; // Estado do modo movimento
        this.resizeMode = false; // Estado do modo resize
        this.resizeElement = null; // Elemento sendo redimensionado
        this.resizeHandles = null; // Container dos handles de resize
        this.isDragging = false; // Estado do drag de resize
        this.dragHandle = null; // Handle sendo arrastado
        this.menuOpen = false;  // Controla se menu está aberto
        
        // Bind methods para manter contexto
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        
        this.init();
    }
    
    init() {
        // Escutar eventos de teclado globalmente
        document.addEventListener('keydown', this.handleKeyDown, true);
        document.addEventListener('keyup', this.handleKeyUp, true);
        
        // Criar overlay para informações do elemento
        this.createOverlay();
        
        // Criar menu de contexto
        this.createContextMenu();
        
        // Criar navbar
        this.createNavbar();
        
        // Criar estilos para efeito glow
        this.createGlowStyles();
        
        // Escutar mensagens do background/popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'toggle':
                case 'toggle-selector':
                    this.toggle();
                    sendResponse({success: true, isActive: this.isActive});
                    break;
                case 'getStatus':
                    sendResponse({isActive: this.isActive});
                    break;
                case 'activate':
                    if (!this.isActive) this.activate();
                    sendResponse({success: true, isActive: this.isActive});
                    break;
                case 'deactivate':
                    if (this.isActive) {
                        this.clearAllHighlights(); // Limpeza preventiva 
                        this.deactivate();
                    }
                    sendResponse({success: true, isActive: this.isActive});
                    break;
            }
        });
        
        // Limpeza preventiva ao carregar/recarregar página
        window.addEventListener('beforeunload', () => {
            if (this.isActive) {
                this.clearAllHighlights();
            }
            // Limpar interval
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
        });
        
        // Verificação periódica para prevenir múltiplos highlights
        this.checkInterval = setInterval(() => {
            if (this.isActive && !this.menuOpen) {
                const highlightedElements = document.querySelectorAll('.leap-ui-highlighted');
                if (highlightedElements.length > 1) {

                    this.clearAllHighlights();
                    // Re-aplicar highlight apenas no elemento atual se existir
                    if (this.currentElement && document.contains(this.currentElement)) {
                        this.highlightElement(this.currentElement);
                    }
                }
            }
        }, 1000); // Verificar a cada segundo
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'leap-ui-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 12px;
            z-index: 999999;
            pointer-events: none;
            display: none;
            white-space: nowrap;
        `;
        document.body.appendChild(this.overlay);
    }
    
    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'leap-ui-context-menu';
        this.contextMenu.style.cssText = `
            position: fixed !important;
            background: white !important;
            border: 1px solid #ddd !important;
            border-radius: 6px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 14px !important;
            z-index: 2147483647 !important;
            display: none !important;
            overflow: hidden !important;
            min-width: 180px !important;
            pointer-events: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
        `;
        
        const menuItems = [
            { id: 'copy-selector', text: 'Copiar Seletor', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg>' },
            { id: 'edit-text', text: 'Editar Texto', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/></svg>' },
            { id: 'duplicate-element', text: 'Duplicar Elemento', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg>' },
            { id: 'resize-element', text: 'Redimensionar Elemento', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 8.354a.5.5 0 1 0-.708-.708l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L4.207 10.5H9.5a.5.5 0 0 0 0-1H4.207l1.147-1.146zm5.292-.354a.5.5 0 0 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2a.5.5 0 0 0-.708.708L11.793 5.5H6.5a.5.5 0 0 0 0 1h5.293L10.646 7.646z"/></svg>' },
            { id: 'delete-element', text: 'Excluir Elemento', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" class="bi bi-trash3" viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/></svg>' },
        ];
        
        menuItems.forEach((item, index) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.dataset.action = item.id;
            menuItem.innerHTML = `<span class="icon">${item.icon}</span><span class="text">${item.text}</span>`;
            menuItem.style.cssText = `
                padding: 10px 12px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                transition: background-color 0.2s !important;
                pointer-events: auto !important;
                position: relative !important;
                z-index: 2147483648 !important;
                ${index === menuItems.length - 1 ? '' : 'border-bottom: 1px solid #f0f0f0 !important;'}
            `;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.handleMenuAction(item.id, this.currentElement);
                this.hideContextMenu();
            });
            
            this.contextMenu.appendChild(menuItem);
        });
        
        document.body.appendChild(this.contextMenu);
        
        // Adicionar event listener de teste diretamente no menu
        this.contextMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.addEventListener('click', (event) => {
            // Só esconder se não for clique no próprio menu
            if (!event.target.closest('#leap-ui-context-menu')) {
                this.hideContextMenu();
            } else {
            }
        });
    }
    
    createNavbar() {
        
        // Tema escuro fixo com botões verdes transparentes
        const theme = {
            bg: '#1F1F1F',
            text: '#ffffff',
            border: '#4a5568',
            accent: '#68B13E',
            btnBg: 'rgba(104, 177, 62, 0.3)',
            btnHover: 'rgba(104, 177, 62, 0.6)'
        };
        
        this.navbar = document.createElement('div');
        this.navbar.id = 'leap-ui-navbar';
        this.navbar.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: auto !important;
            max-width: 90vw !important;
            min-width: auto !important;
            height: 60px !important;
            background: ${theme.bg} !important;
            color: ${theme.text} !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 14px !important;
            z-index: 2147483647 !important;
            display: none !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 24px !important;
            gap: 12px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) !important;
            border-radius: 30px !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            pointer-events: auto !important;
            border: 1px solid rgba(104, 177, 62, 0.2) !important;
        `;
        
        // Prevenir propagação de eventos na navbar
        this.navbar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        this.navbar.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        this.navbar.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });
        
        // Container de botões à esquerda
        const leftButtons = document.createElement('div');
        leftButtons.style.cssText = `
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
        `;
        
        // Logo da extensão
        const logo = document.createElement('img');
        logo.src = chrome.runtime.getURL('icons/logo.png');
        logo.style.cssText = `
            width: 36px !important;
            height: 36px !important;
            margin-right: 12px !important;
            border-radius: 6px !important;
            object-fit: contain !important;
        `;
        logo.alt = 'LeapUI';
        
        leftButtons.appendChild(logo);
        
        // Botão de duplicar
        const duplicateBtn = this.createNavButton('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg>', 'Duplicar Elemento (Ctrl+D)', () => {
            if (this.currentElement) this.duplicateElement(this.currentElement);
        }, theme);
        
        // Botão de excluir
        const deleteBtn = this.createNavButton('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/></svg>', 'Excluir Elemento (Delete)', () => {
            if (this.currentElement) this.deleteElement(this.currentElement);
        }, theme);
        
        
        // Botão de toggle do modo movimento
        const moveToggleBtn = this.createNavButton(
            this.moveMode ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>',
            this.moveMode ? 'Desativar Modo Movimento (ESC)' : 'Ativar Modo Movimento',
            () => this.toggleMoveMode(), theme
        );
        moveToggleBtn.id = 'move-toggle-btn';
        
        // Botão de redimensionar
        const resizeToggleBtn = this.createNavButton(
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 8.354a.5.5 0 1 0-.708-.708l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L4.207 10.5H9.5a.5.5 0 0 0 0-1H4.207l1.147-1.146zm5.292-.354a.5.5 0 0 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2a.5.5 0 0 0-.708.708L11.793 5.5H6.5a.5.5 0 0 0 0 1h5.293L10.646 7.646z"/></svg>',
            this.resizeMode ? 'Desativar Modo Resize (ESC)' : 'Ativar Modo Resize',
            () => this.toggleResizeMode(), theme
        );
        resizeToggleBtn.id = 'resize-toggle-btn';
        
        leftButtons.appendChild(duplicateBtn);
        leftButtons.appendChild(deleteBtn);
        leftButtons.appendChild(resizeToggleBtn);
        leftButtons.appendChild(moveToggleBtn);
        
        // Container de botões à direita
        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = `
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
        `;
        
        // Botão de fechar
        const closeBtn = this.createNavButton('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>', 'Fechar (ESC)', () => this.deactivate(), theme);
        
        // Container de botões de movimento
        const moveButtons = document.createElement('div');
        moveButtons.style.cssText = `
            display: none !important;
        `;
        
        rightButtons.appendChild(closeBtn);
        
        // Montar navbar
        this.navbar.appendChild(leftButtons);
        this.navbar.appendChild(moveButtons);
        this.navbar.appendChild(rightButtons);
        
        document.body.appendChild(this.navbar);
        
        // Criar indicador de elemento separado
        this.createElementIndicator(theme);
    }
    
    createNavButton(icon, title, onClick, theme) {
        const button = document.createElement('button');
        button.innerHTML = icon;
        button.title = title;
        button.style.cssText = `
            background: ${theme.btnBg} !important;
            border: 1px solid ${theme.border} !important;
            color: ${theme.text} !important;
            padding: 6px 10px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            transition: all 0.15s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 32px !important;
            height: 32px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
            position: relative !important;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = theme.btnHover;
            button.style.borderColor = theme.accent;
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = theme.btnBg;
            button.style.borderColor = theme.border;
        });
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
                onClick();
            } catch (error) {
                console.error('Erro ao executar ação do botão:', error);
            }
        });
        
        // Prevenir outros eventos que possam interferir
        button.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        button.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        return button;
    }
    
    createElementIndicator(theme) {
        this.elementIndicator = document.createElement('div');
        this.elementIndicator.id = 'leap-ui-element-indicator';
        this.elementIndicator.style.cssText = `
            position: fixed !important;
            top: 90px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: ${theme.bg} !important;
            color: ${theme.text} !important;
            padding: 8px 16px !important;
            border-radius: 20px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            z-index: 2147483646 !important;
            display: none !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(104, 177, 62, 0.2) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            max-width: 90vw !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        `;
        this.elementIndicator.textContent = 'LeapUI - Passe o mouse sobre elementos';
        document.body.appendChild(this.elementIndicator);
    }
    
    // Métodos de histórico removidos - extensão simplificada
    
    updateElementInfo(element) {
        if (!this.elementIndicator) return;
        
        if (element) {
            const tagName = element.tagName.toLowerCase();
            const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
            const id = element.id ? `#${element.id}` : '';
            
            this.elementIndicator.innerHTML = `
                <span style="font-weight: 600; color: #68B13E;">${tagName}</span><span style="color: #ffffff;">${id}${className}</span>
            `;
            
            if (this.elementIndicator.style.display === 'none') {
                this.elementIndicator.style.display = 'block';
                this.elementIndicator.classList.remove('leap-ui-indicator-hide');
                this.elementIndicator.classList.add('leap-ui-indicator-show');
            }
        } else {
            this.elementIndicator.classList.remove('leap-ui-indicator-show');
            this.elementIndicator.classList.add('leap-ui-indicator-hide');
            
            setTimeout(() => {
                if (this.elementIndicator) {
                    this.elementIndicator.textContent = 'LeapUI - Passe o mouse sobre elementos';
                    this.elementIndicator.style.display = 'none';
                    this.elementIndicator.classList.remove('leap-ui-indicator-hide');
                }
            }, 150); // Tempo da animação de saída
        }
    }
    
    showNavbar() {
        if (this.navbar) {
            this.navbar.style.display = 'flex';
            this.navbar.classList.remove('leap-ui-navbar-hide');
            this.navbar.classList.add('leap-ui-navbar-show');
            // Navbar flutuante não precisa ajustar padding do body
        }
        if (this.elementIndicator) {
            this.elementIndicator.style.display = 'none';
        }
    }
    
    hideNavbar() {
        if (this.navbar) {
            this.navbar.classList.remove('leap-ui-navbar-show');
            this.navbar.classList.add('leap-ui-navbar-hide');
            
            // Esconder depois da animação
            setTimeout(() => {
                if (this.navbar) {
                    this.navbar.style.display = 'none';
                    this.navbar.classList.remove('leap-ui-navbar-hide');
                }
            }, 200); // Tempo da animação de saída
            
            // Navbar flutuante não precisa remover padding do body
        }
        if (this.elementIndicator) {
            this.elementIndicator.style.display = 'none';
        }
    }
    
    handleKeyDown(event) {
        // Alt + I para ativar/desativar
        if (event.altKey && event.key.toLowerCase() === 'i') {
            event.preventDefault();
            event.stopPropagation();
            this.toggle();
        }
        
        // ESC para desativar
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            
            if (this.resizeMode) {
                // Se modo resize está ativo, desativar primeiro
                this.toggleResizeMode();
            } else if (this.moveMode) {
                // Se modo movimento está ativo, desativar primeiro
                this.toggleMoveMode();
            } else if (this.selectedForMovement) {
                // Se há elemento selecionado para movimento, cancelar seleção
                this.cancelMovement();
            } else if (this.menuOpen) {
                // Se menu estiver aberto, fechar apenas o menu primeiro
                this.hideContextMenu();
            } else if (this.isActive) {
                // Se não há menu aberto mas extensão está ativa, desativar completamente
                this.deactivate();
            }
        }
        
        // Enter para selecionar elemento para movimento
        if (event.key === 'Enter' && this.isActive && this.currentElement && !this.selectedForMovement) {
            event.preventDefault();
            event.stopPropagation();
            this.selectForMovement(this.currentElement);
        }
        
        // Atalhos da navbar (apenas quando ativo)
        if (this.isActive && event.ctrlKey) {
            // Ctrl + ← para retroceder
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                event.stopPropagation();
                this.goBack();
            }
            
            // Ctrl + → para avançar
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                event.stopPropagation();
                this.goForward();
            }
            
            // Ctrl + D para duplicar
            if (event.key.toLowerCase() === 'd') {
                event.preventDefault();
                event.stopPropagation();
                if (this.currentElement) {
                    this.duplicateElement(this.currentElement);
                }
            }
        }
        
        // Delete para excluir elemento
        if (event.key === 'Delete' && this.isActive && this.currentElement) {
            event.preventDefault();
            event.stopPropagation();
            this.deleteElement(this.currentElement);
            
            // Ctrl + I para inspecionar
            if (event.key.toLowerCase() === 'i') {
                event.preventDefault();
                event.stopPropagation();
                if (this.currentElement) {
                    this.inspectElement(this.currentElement);
                }
            }
        }
        
        // Setas para mover elemento quando modo movimento estiver ativo
        if (this.moveMode && this.currentElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            
            // Mapear teclas para direções
            const directionMap = {
                'ArrowUp': 'up',
                'ArrowDown': 'down', 
                'ArrowLeft': 'left',
                'ArrowRight': 'right'
            };
            
            this.moveElement(directionMap[event.key]);
        }
        
        // Setas para mover elemento selecionado (modo antigo)
        if (this.selectedForMovement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            this.moveSelectedElement(event.key, event.shiftKey);
        }
    }
    
    handleKeyUp(event) {
        // Prevenir que Alt+I seja processado por outros handlers
        if (event.altKey && event.key.toLowerCase() === 'i') {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    
    toggle() {
        if (this.isActive) {
            // Sempre fazer limpeza completa ao desativar
            this.clearAllHighlights(); // Limpeza extra preventiva
            this.deactivate();
        } else {
            this.activate();
        }
    }
    
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Alterar cursor para crosshair
        this.originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'crosshair';
        
        // Adicionar class para estilos globais
        document.body.classList.add('leap-ui-active');
        
        // Adicionar event listeners
        document.addEventListener('mousemove', this.handleMouseMove, true);
        document.addEventListener('mouseout', this.handleMouseOut, true);
        document.addEventListener('click', this.handleClick, true);
        document.addEventListener('contextmenu', this.handleContextMenu, true);
        
        // Mostrar notificação de ativação
        this.showNotification('LeapUI ativado! Pressione ESC para sair.', 'success');
        
        // Mostrar navbar
        this.showNavbar();
        
        // Notificar mudança de estado
        this.notifyStatusChange();
    }
    
    deactivate() {
        if (!this.isActive) return; 
        this.isActive = false;
        
        // Restaurar cursor
        if (this.originalCursor !== null) {
            document.body.style.cursor = this.originalCursor;
        } else {
            document.body.style.cursor = '';
        }
        
        // Remover class
        document.body.classList.remove('leap-ui-active');
        
        // Desativar modo movimento se estiver ativo
        if (this.moveMode) {
            this.moveMode = false;
            // Remover glow de qualquer elemento
            document.querySelectorAll('.leap-ui-move-mode').forEach(el => {
                el.classList.remove('leap-ui-move-mode');
            });
        }
        
        // Desativar modo resize se estiver ativo
        if (this.resizeMode) {
            this.resizeMode = false;
            this.hideResizeHandles();
        }
        
        // Limpar elemento atual
        this.clearCurrentElement();
        
        // IMPORTANTE: Limpar TODOS os elementos com highlight
        this.clearAllHighlights();
        
        // Esconder overlay
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        
        // Esconder menu de contexto
        this.hideContextMenu();
        this.menuOpen = false;
        
        // Cancelar movimento se ativo
        if (this.selectedForMovement) {
            this.cancelMovement();
        }
        
        // Esconder navbar
        this.hideNavbar();
        
        // Remover event listeners
        document.removeEventListener('mousemove', this.handleMouseMove, true);
        document.removeEventListener('mouseout', this.handleMouseOut, true);
        document.removeEventListener('click', this.handleClick, true);
        document.removeEventListener('contextmenu', this.handleContextMenu, true);
        
        // Resetar estados internos
        this.currentElement = null;
        this.originalOutline = null;
        
        // Esconder indicador de elemento
        if (this.elementIndicator) {
            this.elementIndicator.style.display = 'none';
        }
        
        // Limpar verificação periódica
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Mostrar notificação de desativação
        this.showNotification('LeapUI desativado.', 'info');
        
        // Notificar mudança de estado
        this.notifyStatusChange();
    }
    
    handleMouseMove(event) {
        if (!this.isActive) return;
        
        // PAUSAR highlight se modo resize estiver ativo
        if (this.resizeMode) {
            return;  // Não detectar outros elementos durante resize
        }
        
        // PAUSAR highlight se menu estiver aberto
        if (this.menuOpen) {
            return;  // Não fazer nada se menu estiver aberto
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const element = event.target;
        
        // Ignorar overlay, navbar, indicador e elementos relacionados
        if (element === this.overlay || element.closest('#leap-ui-overlay, #leap-ui-navbar, #leap-ui-element-indicator, .leap-ui-notification, #leap-ui-context-menu')) {
            return;
        }
        
        // Se for o mesmo elemento, não fazer nada
        if (element === this.currentElement) {
            return;
        }
        
        this.highlightElement(element);
        this.updateElementInfo(element);
        this.updateOverlay(element, event);
    }
    
    handleMouseOut(event) {
        if (!this.isActive) return;
        
        // Só limpar se não estivermos indo para um elemento filho
        if (!event.relatedTarget || !event.target.contains(event.relatedTarget)) {
            // Não limpar ainda, apenas quando sair completamente
        }
    }
    
    handleClick(event) {
        if (!this.isActive) return;
        
        // PAUSAR cliques se modo resize estiver ativo
        if (this.resizeMode) {
            return;  // Não mostrar menu de contexto durante resize
        }
        
        const element = event.target;
        
        // Ignorar cliques no overlay, navbar, indicador, menu de contexto e notificações
        if (element === this.overlay || 
            element.closest('#leap-ui-overlay, #leap-ui-navbar, #leap-ui-element-indicator, .leap-ui-notification, #leap-ui-context-menu')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar menu de contexto e pausar highlight
        this.showContextMenu(event, element);
    }
    
    handleContextMenu(event) {
        if (!this.isActive) return;
        event.preventDefault();
    }
    
    highlightElement(element) {
        // IMPORTANTE: Sempre limpar TODOS os highlights antes de aplicar novo
        this.clearAllHighlights();
        
        // Verificar se elemento é válido
        if (!element || !element.tagName) {

            return;
        }
        
        // Ignorar elementos do próprio sistema
        if (element.closest('#leap-ui-overlay, #leap-ui-element-indicator, .leap-ui-notification, #leap-ui-context-menu')) {
            return;
        }
        
        // Salvar elemento atual
        this.currentElement = element;
        this.originalOutline = element.style.outline;
        
        // Histórico removido - funcionalidade simplificada
        
        // Atualizar info da navbar
        this.updateElementInfo(element);
        
        // Aplicar highlight com glow verde
        element.style.outline = 'none';
        element.classList.add('leap-ui-highlighted');
        
        // Se modo movimento estiver ativo, aplicar glow também
        if (this.moveMode) {
            this.applyMoveGlow(element);
        }
        
        // Verificação de segurança: garantir que apenas este elemento tem highlight
        setTimeout(() => {
            const highlightedElements = document.querySelectorAll('.leap-ui-highlighted');
            if (highlightedElements.length > 1) {

                highlightedElements.forEach((el, index) => {
                    if (el !== element) {
                        el.style.outline = '';
                        el.style.outlineOffset = '';
                        el.classList.remove('leap-ui-highlighted');
                    }
                });
            }
        }, 10);
    }
    
    clearCurrentElement() {
        if (this.currentElement) {
            // Restaurar outline original
            if (this.originalOutline !== null) {
                this.currentElement.style.outline = this.originalOutline;
            } else {
                this.currentElement.style.outline = '';
            }
            this.currentElement.style.outlineOffset = '';
            this.currentElement.classList.remove('leap-ui-highlighted');
            
            this.currentElement = null;
            this.originalOutline = null;
        }
    }
    
    clearAllHighlights() {
        
        // Método 1: Remover classe de todos os elementos
        const highlightedElements = document.querySelectorAll('.leap-ui-highlighted');
        highlightedElements.forEach((element, index) => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.classList.remove('leap-ui-highlighted');
        });
        
        // Método 2: Buscar por outline ou box-shadow dos highlights
        const elementsWithHighlight = document.querySelectorAll('.leap-ui-highlighted, .leap-ui-move-mode');
        elementsWithHighlight.forEach((element, index) => {
            element.style.outline = '';
            element.style.boxShadow = '';
            element.classList.remove('leap-ui-highlighted', 'leap-ui-move-mode');
        });
        
        // Resetar variáveis de controle
        this.currentElement = null;
        this.originalOutline = null;
        
        // Debug: verificar se ainda há elementos com highlight
        const remainingHighlights = document.querySelectorAll('.leap-ui-highlighted, .leap-ui-move-mode');
        
        if (remainingHighlights.length > 0) {
            console.warn('⚠️ Ainda existem elementos com highlight após limpeza:', remainingHighlights.length);
            // Forçar limpeza dos restantes
            remainingHighlights.forEach(el => {
                el.style.outline = '';
                el.style.boxShadow = '';
                el.classList.remove('leap-ui-highlighted', 'leap-ui-move-mode');
            });
        } else {
        }
    }
    
    updateOverlay(element, event) {
        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
        const text = element.textContent ? element.textContent.substring(0, 50) + '...' : '';
        
        let displayText = `<${tagName}${id}${classes}>`;
        if (text.trim()) {
            displayText += ` "${text.trim()}"`;
        }
        
        this.overlay.textContent = displayText;
        this.overlay.style.display = 'block';
        this.overlay.style.left = (event.clientX + 10) + 'px';
        this.overlay.style.top = (event.clientY - 30) + 'px';
    }
    
    generateSelector(element) {
        // Gerar seletor CSS único para o elemento
        let selector = element.tagName.toLowerCase();
        
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c.trim() && !c.startsWith('leap-ui-'));
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }
        
        // Se não for único, adicionar nth-child
        const siblings = Array.from(element.parentNode?.children || []).filter(e => e.tagName === element.tagName);
        if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            selector += `:nth-child(${index})`;
        }
        
        return selector;
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback para browsers mais antigos
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }
    
    logElementInfo(element) {


    }
    
    showNotification(message, type = 'info') {
        // Remove notificação anterior se existir
        const existingNotification = document.querySelector('.leap-ui-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const notification = document.createElement('div');
        notification.className = 'leap-ui-notification';
        notification.textContent = message;
        
        const colors = {
            success: '#68B13E',
            error: '#dc3545',
            info: isDarkTheme ? '#6c757d' : '#495057',
            warning: '#fd7e14'
        };
        
        const bgColors = {
            success: '#68B13E',
            error: '#dc3545',
            info: isDarkTheme ? '#343a40' : '#f8f9fa',
            warning: '#fd7e14'
        };
        
        const textColors = {
            success: '#ffffff',
            error: '#ffffff', 
            info: isDarkTheme ? '#ffffff' : '#333333',
            warning: '#ffffff'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 16px;
            background: ${bgColors[type] || bgColors.info};
            color: ${textColors[type] || textColors.info};
            border: 1px solid ${colors[type] || colors.info};
            padding: 8px 12px;
            border-radius: 4px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            font-weight: 500;
            z-index: 1000000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideIn 0.2s ease-out;
        `;
        
        // Adicionar animação CSS
        if (!document.querySelector('#leap-ui-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'leap-ui-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
    
    showContextMenu(event, element) {
        
        // IMPORTANTE: Limpar todos os highlights primeiro
        this.clearAllHighlights();
        
        // Pausar highlight e definir elemento atual
        this.menuOpen = true;
        
        // Destacar apenas o elemento clicado
        this.highlightElement(element);
        
        // Esconder overlay enquanto menu estiver aberto
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        
        if (!this.contextMenu) {
            this.createContextMenu();
        }
        this.contextMenu.style.display = 'block';
        
        // Debug: verificar se menu está realmente visível
        setTimeout(() => {
            const rect = this.contextMenu.getBoundingClientRect();
            const computed = window.getComputedStyle(this.contextMenu);
        }, 100);
        
        const x = event.clientX;
        const y = event.clientY;
        const menuRect = this.contextMenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Ajustar posição se sair da tela
        let left = x;
        let top = y;
        
        if (x + menuRect.width > windowWidth) {
            left = x - menuRect.width;
        }
        
        if (y + menuRect.height > windowHeight) {
            top = y - menuRect.height;
        }
        
        this.contextMenu.style.left = left + 'px';
        this.contextMenu.style.top = top + 'px';
        
        // Habilitar/desabilitar opções baseado no elemento
        const editTextItem = this.contextMenu.querySelector('[data-action="edit-text"]');
        if (editTextItem) {
            const hasText = element.textContent && element.textContent.trim().length > 0;
            editTextItem.style.opacity = hasText ? '1' : '0.5';
            editTextItem.style.pointerEvents = hasText ? 'auto' : 'none';
        }
    }
    
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
        
        // Retomar highlight normal
        this.menuOpen = false;
        
        // Resetar currentElement se não estivermos ativos
        if (!this.isActive) {
            this.currentElement = null;
        }
        
        // Mostrar overlay novamente se estivermos ativos
        if (this.isActive && this.overlay) {
            this.overlay.style.display = 'block';
        }
    }
    
    handleMenuAction(action, element) {
        switch (action) {
            case 'copy-selector':
                this.copyElementSelector(element);
                break;
            case 'edit-text':
                this.editElementText(element);
                break;
            case 'duplicate-element':
                this.duplicateElement(element);
                break;
            case 'delete-element':
                this.deleteElement(element);
                break;
            case 'resize-element':
                this.toggleResizeMode(element);
                break;
            case 'inspect-element':
                this.inspectElement(element);
                break;
            default:
        }
    }
    
    copyElementSelector(element) {
        const selector = this.generateSelector(element);
        this.copyToClipboard(selector);
        this.logElementInfo(element);
        this.showNotification(`Seletor copiado: ${selector}`, 'success');
    }
    
    editElementText(element) {
        if (!element.textContent || element.textContent.trim().length === 0) {
            this.showNotification('Este elemento não possui texto para editar', 'warning');
            return;
        }
        
        this.isEditing = true;
        const originalText = element.textContent;
        const originalContentEditable = element.contentEditable;
        
        // Tornar elemento editável
        element.contentEditable = true;
        element.focus();
        
        // Selecionar todo o texto
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        this.showNotification('Editando texto... Pressione Enter para salvar, ESC para cancelar', 'info');
        
        const finishEditing = (save = false) => {
            if (!save) {
                element.textContent = originalText;
            }
            element.contentEditable = originalContentEditable;
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.blur();
            this.isEditing = false;
            
            const message = save ? 'Texto salvo com sucesso!' : 'Edição cancelada';
            this.showNotification(message, save ? 'success' : 'info');
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEditing(true);
                document.removeEventListener('keydown', keyHandler);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishEditing(false);
                document.removeEventListener('keydown', keyHandler);
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        
        // Auto-salvar se clicar fora
        const blurHandler = () => {
            setTimeout(() => {
                if (document.activeElement !== element && this.isEditing) {
                    finishEditing(true);
                    element.removeEventListener('blur', blurHandler);
                }
            }, 100);
        };
        
        element.addEventListener('blur', blurHandler);
    }
    
    duplicateElement(element) {
        // Criar cópia do elemento
        const clone = element.cloneNode(true);
        
        // Remover IDs para evitar conflitos
        this.removeIds(clone);
        
        // Adicionar estilos para indicar que é uma cópia
        clone.style.position = 'relative';
        clone.style.opacity = '0.8';
        clone.style.transform = 'translateX(10px) translateY(10px)';
        clone.style.border = '2px dashed #ff9800';
        clone.classList.add('leap-ui-duplicate');
        
        // Inserir após o elemento original
        element.parentNode.insertBefore(clone, element.nextSibling);
        
        this.showNotification('Elemento duplicado!', 'success');
        
        // Elemento duplicado criado com sucesso
        
        // Destacar temporariamente
        setTimeout(() => {
            clone.style.border = '';
            clone.style.opacity = '1';
        }, 2000);
    }
    
    removeIds(element) {
        // Remove ID do elemento e de todos os filhos
        element.removeAttribute('id');
        const childrenWithIds = element.querySelectorAll('[id]');
        childrenWithIds.forEach(child => child.removeAttribute('id'));
    }
    
    deleteElement(element) {
        if (!element || !element.parentNode) {
            this.showNotification('Elemento inválido ou já foi removido', 'warning');
            return;
        }
        
        // Verificar se é um elemento crítico da página
        const criticalElements = ['html', 'head', 'body', 'script', 'style', 'meta', 'title'];
        if (criticalElements.includes(element.tagName.toLowerCase())) {
            this.showNotification('Não é possível excluir elementos críticos da página', 'error');
            return;
        }
        
        // Verificar se é um elemento da própria extensão
        if (element.closest('#leap-ui-overlay, #leap-ui-navbar, #leap-ui-element-indicator, .leap-ui-notification, #leap-ui-context-menu')) {
            this.showNotification('Não é possível excluir elementos da extensão', 'error');
            return;
        }
        
        // Adicionar efeito visual de exclusão
        element.style.transition = 'all 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8)';
        element.style.background = '#ff4444';
        
        // Remover elemento após animação
        setTimeout(() => {
            try {
                // Limpar referências se for o elemento atual
                if (this.currentElement === element) {
                    this.currentElement = null;
                    this.originalOutline = null;
                }
                
                // Remover do DOM
                element.parentNode.removeChild(element);
                
                this.showNotification('Elemento excluído com sucesso!', 'success');
                
                // Atualizar info do indicador
                this.updateElementInfo(null);
                
            } catch (error) {
                console.error('Erro ao excluir elemento:', error);
                this.showNotification('Erro ao excluir elemento', 'error');
            }
        }, 300); // Tempo da animação
    }
    
    selectForMovement(element) {
        this.selectedForMovement = element;
        
        // Preparar elemento para movimento
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.position === 'static') {
            element.style.position = 'relative';
        }
        
        // Adicionar indicador visual
        element.style.boxShadow = '0 0 0 3px #00ff00, 0 0 10px rgba(0, 255, 0, 0.5)';
        element.style.transition = 'all 0.1s ease';
        
        this.showNotification('Elemento selecionado! Use as setas para mover (Shift = movimento rápido)', 'info');
    }
    
    cancelMovement() {
        if (!this.selectedForMovement) return;
        
        // Remover indicadores visuais
        this.selectedForMovement.style.boxShadow = '';
        this.selectedForMovement.style.transition = '';
        this.selectedForMovement = null;
        this.showNotification('Movimento cancelado', 'info');
    }
    
    moveSelectedElement(key, isShiftPressed) {
        if (!this.selectedForMovement) return;
        
        const element = this.selectedForMovement;
        const computedStyle = window.getComputedStyle(element);
        
        // Obter posição atual
        let currentTop = parseInt(computedStyle.top) || 0;
        let currentLeft = parseInt(computedStyle.left) || 0;
        
        // Determinar incremento (shift = movimento rápido)
        const increment = isShiftPressed ? 10 : 1;
        
        // Calcular nova posição
        switch (key) {
            case 'ArrowUp':
                currentTop -= increment;
                break;
            case 'ArrowDown':
                currentTop += increment;
                break;
            case 'ArrowLeft':
                currentLeft -= increment;
                break;
            case 'ArrowRight':
                currentLeft += increment;
                break;
        }
        
        // Aplicar nova posição
        element.style.top = currentTop + 'px';
        element.style.left = currentLeft + 'px';
    }
    
    inspectElement(element) {
        this.logElementInfo(element);
        this.showNotification('Informações do elemento logadas no console', 'info');
    }
    
    // Método toggleTheme removido - tema escuro fixo
    
    toggleMoveMode() {
        this.moveMode = !this.moveMode;
        
        if (this.moveMode) {
            // Ativar modo movimento
            if (this.currentElement) {
                this.applyMoveGlow(this.currentElement);
                this.showNotification('Modo Movimento ATIVO! Use as setas ←↑→↓ para mover o elemento', 'success');
            } else {
                this.showNotification('⚠️ Selecione um elemento primeiro para ativar o modo movimento', 'warning');
                this.moveMode = false;
                return;
            }
        } else {
            // Desativar modo movimento
            if (this.currentElement) {
                this.removeMoveGlow(this.currentElement);
            }
            this.showNotification('Modo Movimento DESATIVADO', 'info');
        }
        
        // Atualizar navbar
        this.updateMoveButton();
    }
    
    applyMoveGlow(element) {
        // Remover glow de outros elementos
        document.querySelectorAll('.leap-ui-move-mode').forEach(el => {
            el.classList.remove('leap-ui-move-mode');
        });
        
        // Aplicar glow no elemento atual
        element.classList.add('leap-ui-move-mode');
    }
    
    removeMoveGlow(element) {
        element.classList.remove('leap-ui-move-mode');
    }
    
    updateMoveButton() {
        const moveToggleBtn = document.getElementById('move-toggle-btn');
        if (moveToggleBtn) {
            moveToggleBtn.innerHTML = this.moveMode ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>';
            moveToggleBtn.title = this.moveMode ? 'Desativar Modo Movimento (ESC)' : 'Ativar Modo Movimento';
            
            // Atualizar estilo do botão (tema escuro fixo com transparência)
            if (this.moveMode) {
                moveToggleBtn.style.background = 'rgba(104, 177, 62, 0.8)';
                moveToggleBtn.style.color = '#ffffff';
                moveToggleBtn.style.borderColor = '#68B13E';
            } else {
                // Estilo padrão - tema escuro fixo com transparência
                moveToggleBtn.style.background = 'rgba(104, 177, 62, 0.3)';
                moveToggleBtn.style.color = '#ffffff';
                moveToggleBtn.style.borderColor = 'rgba(74, 85, 104, 0.5)';
            }
        }
    }
    
    toggleResizeMode(element = null) {
        this.resizeMode = !this.resizeMode;
        
        if (this.resizeMode) {
            // Ativar modo resize
            if (element || this.currentElement) {
                this.resizeElement = element || this.currentElement;
                this.showResizeHandles(this.resizeElement);
                
                // Esconder overlay durante modo resize
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                }
                
                this.showNotification('Modo Resize ATIVO! Arraste os handles para redimensionar', 'success');
            } else {
                this.showNotification('⚠️ Selecione um elemento primeiro para ativar o modo resize', 'warning');
                this.resizeMode = false;
                return;
            }
        } else {
            // Desativar modo resize
            this.hideResizeHandles();
            this.resizeElement = null;
            
            // Mostrar overlay novamente
            if (this.overlay) {
                this.overlay.style.display = 'block';
            }
            
            this.showNotification('Modo Resize DESATIVADO', 'info');
        }
        
        // Atualizar navbar
        this.updateResizeButton();
    }
    
    showResizeHandles(element) {
        // Remover handles existentes
        this.hideResizeHandles();
        
        // Criar container dos handles
        this.resizeHandles = document.createElement('div');
        this.resizeHandles.id = 'leap-ui-resize-handles';
        this.resizeHandles.style.cssText = `
            position: absolute !important;
            pointer-events: none !important;
            z-index: 999999 !important;
        `;
        
        // Posicionar os handles
        this.updateHandlePositions(element);
        
        // Criar 8 handles (cantos + bordas)
        const handlePositions = [
            { name: 'nw', cursor: 'nw-resize', position: 'top: -5px; left: -5px;' },
            { name: 'n', cursor: 'n-resize', position: 'top: -5px; left: 50%; transform: translateX(-50%);' },
            { name: 'ne', cursor: 'ne-resize', position: 'top: -5px; right: -5px;' },
            { name: 'e', cursor: 'e-resize', position: 'top: 50%; right: -5px; transform: translateY(-50%);' },
            { name: 'se', cursor: 'se-resize', position: 'bottom: -5px; right: -5px;' },
            { name: 's', cursor: 's-resize', position: 'bottom: -5px; left: 50%; transform: translateX(-50%);' },
            { name: 'sw', cursor: 'sw-resize', position: 'bottom: -5px; left: -5px;' },
            { name: 'w', cursor: 'w-resize', position: 'top: 50%; left: -5px; transform: translateY(-50%);' }
        ];
        
        handlePositions.forEach(handle => {
            const handleElement = document.createElement('div');
            handleElement.className = `leap-ui-resize-handle leap-ui-resize-${handle.name}`;
            handleElement.style.cssText = `
                position: absolute !important;
                width: 10px !important;
                height: 10px !important;
                background: #68B13E !important;
                border: 2px solid #ffffff !important;
                border-radius: 50% !important;
                cursor: ${handle.cursor} !important;
                pointer-events: all !important;
                z-index: 1000000 !important;
                ${handle.position}
            `;
            
            // Adicionar eventos de drag
            handleElement.addEventListener('mousedown', (e) => this.startDrag(e, handle.name, element));
            
            this.resizeHandles.appendChild(handleElement);
        });
        
        document.body.appendChild(this.resizeHandles);
        
        // Atualizar posições quando página rolar
        this.scrollListener = () => this.updateHandlePositions(element);
        window.addEventListener('scroll', this.scrollListener, true);
        window.addEventListener('resize', this.scrollListener);
    }
    
    hideResizeHandles() {
        if (this.resizeHandles) {
            this.resizeHandles.remove();
            this.resizeHandles = null;
        }
        
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener, true);
            window.removeEventListener('resize', this.scrollListener);
            this.scrollListener = null;
        }
    }
    
    updateHandlePositions(element) {
        if (!this.resizeHandles || !element) return;
        
        const rect = element.getBoundingClientRect();
        this.resizeHandles.style.top = rect.top + window.scrollY + 'px';
        this.resizeHandles.style.left = rect.left + window.scrollX + 'px';
        this.resizeHandles.style.width = rect.width + 'px';
        this.resizeHandles.style.height = rect.height + 'px';
    }
    
    startDrag(e, handleType, element) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        this.dragHandle = handleType;
        
        const rect = element.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = rect.width;
        const startHeight = rect.height;
        const startLeft = rect.left;
        const startTop = rect.top;
        
        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            
            // Calcular novas dimensões baseado no handle
            switch (handleType) {
                case 'nw':
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight - deltaY;
                    newLeft = startLeft + deltaX;
                    newTop = startTop + deltaY;
                    break;
                case 'n':
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                    break;
                case 'ne':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                    break;
                case 'e':
                    newWidth = startWidth + deltaX;
                    break;
                case 'se':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight + deltaY;
                    break;
                case 's':
                    newHeight = startHeight + deltaY;
                    break;
                case 'sw':
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight + deltaY;
                    newLeft = startLeft + deltaX;
                    break;
                case 'w':
                    newWidth = startWidth - deltaX;
                    newLeft = startLeft + deltaX;
                    break;
            }
            
            // Aplicar tamanho mínimo
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);
            
            // Aplicar mudanças
            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
            
            // Atualizar posição se necessário
            if (handleType.includes('w')) {
                element.style.left = (newLeft - rect.left + parseInt(element.style.left || 0)) + 'px';
            }
            if (handleType.includes('n')) {
                element.style.top = (newTop - rect.top + parseInt(element.style.top || 0)) + 'px';
            }
            
            // Atualizar posições dos handles
            this.updateHandlePositions(element);
        };
        
        const handleMouseUp = () => {
            this.isDragging = false;
            this.dragHandle = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    updateResizeButton() {
        const resizeToggleBtn = document.getElementById('resize-toggle-btn');
        if (resizeToggleBtn) {
            resizeToggleBtn.innerHTML = this.resizeMode ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 8.354a.5.5 0 1 0-.708-.708l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L4.207 10.5H9.5a.5.5 0 0 0 0-1H4.207l1.147-1.146zm5.292-.354a.5.5 0 0 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2a.5.5 0 0 0-.708.708L11.793 5.5H6.5a.5.5 0 0 0 0 1h5.293L10.646 7.646z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 8.354a.5.5 0 1 0-.708-.708l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L4.207 10.5H9.5a.5.5 0 0 0 0-1H4.207l1.147-1.146zm5.292-.354a.5.5 0 0 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2a.5.5 0 0 0-.708.708L11.793 5.5H6.5a.5.5 0 0 0 0 1h5.293L10.646 7.646z"/></svg>';
            resizeToggleBtn.title = this.resizeMode ? 'Desativar Modo Resize (ESC)' : 'Ativar Modo Resize';
            
            // Atualizar estilo do botão
            if (this.resizeMode) {
                resizeToggleBtn.style.background = 'rgba(104, 177, 62, 0.8)';
                resizeToggleBtn.style.color = '#ffffff';
                resizeToggleBtn.style.borderColor = '#68B13E';
            } else {
                resizeToggleBtn.style.background = 'rgba(104, 177, 62, 0.3)';
                resizeToggleBtn.style.color = '#ffffff';
                resizeToggleBtn.style.borderColor = 'rgba(74, 85, 104, 0.5)';
            }
        }
    }
    
    createGlowStyles() {
        // Criar estilos para efeito glow e animações da navbar
        if (!document.querySelector('#leap-ui-glow-styles')) {
            const style = document.createElement('style');
            style.id = 'leap-ui-glow-styles';
            style.textContent = `
                /* Efeitos de highlight */
                .leap-ui-highlighted {
                    box-shadow: 0 0 0 2px #68B13E, 0 0 8px rgba(104, 177, 62, 0.6) !important;
                    outline: none !important;
                }
                
                .leap-ui-move-mode {
                    box-shadow: 0 0 0 3px #68B13E, 0 0 15px rgba(104, 177, 62, 0.8) !important;
                    outline: none !important;
                }
                
                /* Animações da navbar */
                @keyframes navbarSlideIn {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px) scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                }
                
                @keyframes navbarSlideOut {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px) scale(0.95);
                    }
                }
                
                .leap-ui-navbar-show {
                    animation: navbarSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards !important;
                }
                
                .leap-ui-navbar-hide {
                    animation: navbarSlideOut 0.2s ease-in forwards !important;
                }
                
                /* Animações do indicador de elemento */
                @keyframes indicatorSlideIn {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                
                @keyframes indicatorSlideOut {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-10px);
                    }
                }
                
                .leap-ui-indicator-show {
                    animation: indicatorSlideIn 0.2s ease-out forwards !important;
                }
                
                .leap-ui-indicator-hide {
                    animation: indicatorSlideOut 0.15s ease-in forwards !important;
                }
                
                /* Estilos para handles de resize */
                .leap-ui-resize-handle {
                    transition: all 0.1s ease !important;
                }
                
                .leap-ui-resize-handle:hover {
                    background: #5a9e35 !important;
                    transform: scale(1.2) !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    moveElement(direction) {
        if (!this.currentElement) {
            this.showNotification('Nenhum elemento selecionado para mover', 'warning');
            return;
        }
        
        const element = this.currentElement;
        const step = 10; // pixels para mover
        
        // Obter posição atual
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        // Se elemento não tem position absolute/relative, definir relative
        if (style.position === 'static') {
            element.style.position = 'relative';
            element.style.top = '0px';
            element.style.left = '0px';
        }
        
        // Obter valores atuais (ou 0 se não definido)
        const currentTop = parseInt(element.style.top) || 0;
        const currentLeft = parseInt(element.style.left) || 0;
        
        // Aplicar movimento
        switch (direction) {
            case 'up':
                element.style.top = (currentTop - step) + 'px';
                break;
            case 'down':
                element.style.top = (currentTop + step) + 'px';
                break;
            case 'left':
                element.style.left = (currentLeft - step) + 'px';
                break;
            case 'right':
                element.style.left = (currentLeft + step) + 'px';
                break;
        }
        
        // Mostrar notificação
        const directions = {
            'up': '⬆️ Para Cima',
            'down': '⬇️ Para Baixo', 
            'left': '⬅️ Para Esquerda',
            'right': '➡️ Para Direita'
        };
        
        this.showNotification(`Elemento movido ${directions[direction]}`, 'success');
    }
    
    notifyStatusChange() {
        // Enviar mensagem para o background/popup sobre mudança de estado
        try {
            chrome.runtime.sendMessage({
                action: 'statusChanged', 
                isActive: this.isActive
            });
        } catch (error) {
            // Ignorar erros de comunicação (popup pode estar fechado)
        }
    }
    
    // Método público para debug - forçar limpeza manual
    forceCleanup() {
        this.clearAllHighlights();
        if (this.menuOpen) {
            this.hideContextMenu();
        }
    }
}

// Inicializar quando o DOM estiver pronto
let leapUIInstance;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        leapUIInstance = new LeapUISelector();
        window.leapUI = leapUIInstance; // Expor globalmente para debug
        // Comando de emergência para limpeza
        window.cleanHighlights = () => leapUIInstance.forceCleanup();
    });
} else {
    leapUIInstance = new LeapUISelector();
    window.leapUI = leapUIInstance; // Expor globalmente para debug
    // Comando de emergência para limpeza
    window.cleanHighlights = () => leapUIInstance.forceCleanup();
}

// Limpeza global quando página é descarregada
window.addEventListener('beforeunload', () => {
    if (leapUIInstance) {
        leapUIInstance.clearAllHighlights();
        if (leapUIInstance.checkInterval) {
            clearInterval(leapUIInstance.checkInterval);
        }
    }
});
