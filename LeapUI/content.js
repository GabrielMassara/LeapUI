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
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 60px !important;
            background: ${theme.bg} !important;
            color: ${theme.text} !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 14px !important;
            z-index: 2147483647 !important;
            display: none !important;
            align-items: center !important;
            padding: 0 20px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
            border-bottom: 1px solid ${theme.border} !important;
            backdrop-filter: blur(10px) !important;
            pointer-events: auto !important;
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
        
        
        // Botão de toggle do modo movimento
        const moveToggleBtn = this.createNavButton(
            this.moveMode ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>✨' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>',
            this.moveMode ? 'Desativar Modo Movimento (ESC)' : 'Ativar Modo Movimento',
            () => this.toggleMoveMode(), theme
        );
        moveToggleBtn.id = 'move-toggle-btn';
        
        leftButtons.appendChild(duplicateBtn);
        leftButtons.appendChild(moveToggleBtn);
        
        // Container central com info do elemento
        const centerInfo = document.createElement('div');
        centerInfo.id = 'navbar-element-info';
        centerInfo.style.cssText = `
            flex: 1 !important;
            text-align: center !important;
            font-weight: 500 !important;
            color: ${theme.text} !important;
            font-size: 13px !important;
        `;
        centerInfo.textContent = 'LeapUI - Passe o mouse sobre elementos';
        
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
        this.navbar.appendChild(centerInfo);
        this.navbar.appendChild(rightButtons);
        
        document.body.appendChild(this.navbar);
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
    
    // Métodos de histórico removidos - extensão simplificada
    
    updateElementInfo(element) {
        if (!this.navbar) return;
        
        const infoContainer = document.getElementById('navbar-element-info');
        if (infoContainer && element) {
            const tagName = element.tagName.toLowerCase();
            const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
            const id = element.id ? `#${element.id}` : '';
            
            infoContainer.innerHTML = `
                <span style="font-weight: 600; color: #68B13E;">${tagName}</span><span style="color: #ffffff;">${id}${className}</span>
            `;
        } else if (infoContainer) {
            infoContainer.textContent = 'LeapUI - Passe o mouse sobre elementos';
        }
    }
    
    showNavbar() {
        if (this.navbar) {
            this.navbar.style.display = 'flex';
            // Ajustar o body para não ficar atrás da navbar
            document.body.style.paddingTop = '60px';
        }
    }
    
    hideNavbar() {
        if (this.navbar) {
            this.navbar.style.display = 'none';
            // Remover padding do body
            document.body.style.paddingTop = '';
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
            
            if (this.moveMode) {
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
        
        // PAUSAR highlight se menu estiver aberto
        if (this.menuOpen) {
            return;  // Não fazer nada se menu estiver aberto
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const element = event.target;
        
        // Ignorar overlay, navbar e elementos relacionados
        if (element === this.overlay || element.closest('#leap-ui-overlay, #leap-ui-navbar, .leap-ui-notification, #leap-ui-context-menu')) {
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
        
        const element = event.target;
        
        // Ignorar cliques no overlay, navbar, menu de contexto e notificações
        if (element === this.overlay || 
            element.closest('#leap-ui-overlay, #leap-ui-navbar, .leap-ui-notification, #leap-ui-context-menu')) {
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
        if (element.closest('#leap-ui-overlay, .leap-ui-notification, #leap-ui-context-menu')) {
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
            top: 60px;
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
            moveToggleBtn.innerHTML = this.moveMode ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>✨' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/></svg>';
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
    
    createGlowStyles() {
        // Estilos já definidos no styles.css
        // Não precisamos criar estilos duplicados aqui
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
