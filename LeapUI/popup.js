// LeapUI - Popup Script

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const statusElement = document.getElementById('status');
    
    // Estado atual da extensão
    let isActive = false;
    
    // Inicializar popup
    init();
    
    async function init() {
        // Verificar se há uma aba ativa
        try {
            const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (activeTab) {
                // Verificar se o content script pode ser executado na aba atual
                const url = activeTab.url;
                if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
                    showUnavailableState();
                    return;
                }
                
                // Tentar obter status atual
                try {
                    const response = await chrome.tabs.sendMessage(activeTab.id, {action: 'getStatus'});
                    updateUI(response?.isActive || false);
                } catch (error) {
                    // Content script ainda não foi injetado ou aba não suporta
                    updateUI(false);
                }
            }
        } catch (error) {
            console.error('Erro ao inicializar popup:', error);
            updateUI(false);
        }
    }
    
    function showUnavailableState() {
        statusElement.textContent = 'Não disponível nesta página';
        statusElement.className = 'status inactive';
        toggleButton.textContent = 'Não Disponível';
        toggleButton.disabled = true;
        toggleButton.style.opacity = '0.5';
        toggleButton.style.cursor = 'not-allowed';
    }
    
    function updateUI(active) {
        isActive = active;
        
        if (active) {
            statusElement.textContent = 'Status: Ativo';
            statusElement.className = 'status active';
            toggleButton.textContent = 'Desativar Seletor';
        } else {
            statusElement.textContent = 'Status: Inativo';
            statusElement.className = 'status inactive';
            toggleButton.textContent = 'Ativar Seletor';
        }
    }
    
    // Event listener para o botão
    toggleButton.addEventListener('click', async function() {
        if (toggleButton.disabled) return;
        
        try {
            const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (activeTab) {
                // Enviar mensagem para toggle
                await chrome.tabs.sendMessage(activeTab.id, {action: 'toggle'});
                
                // Atualizar UI (inverter estado atual)
                updateUI(!isActive);
                
                // Fechar popup após ação
                setTimeout(() => {
                    window.close();
                }, 500);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            
            // Se falhou, talvez precise injetar o content script primeiro
            try {
                const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
                await chrome.scripting.executeScript({
                    target: {tabId: activeTab.id},
                    files: ['content.js']
                });
                
                // Tentar novamente após injeção
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(activeTab.id, {action: 'toggle'});
                        updateUI(!isActive);
                        window.close();
                    } catch (retryError) {
                        console.error('Erro no retry:', retryError);
                    }
                }, 100);
            } catch (injectError) {
                console.error('Erro ao injetar script:', injectError);
            }
        }
    });
    
    // Adicionar informações de debug no console
    console.log('LeapUI Popup carregado');
    
    // Escutar mudanças de status da extensão
    chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
        if (message.action === 'statusChanged') {
            updateUI(message.isActive);
        }
    });
    
    // Adicionar event listener para teclas de atalho no popup
    document.addEventListener('keydown', function(event) {
        if (event.altKey && event.key.toLowerCase() === 'i') {
            event.preventDefault();
            toggleButton.click();
        }
        
        if (event.key === 'Escape') {
            window.close();
        }
    });
});