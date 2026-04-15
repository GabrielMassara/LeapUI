// LeapUI - Service Worker
console.log('LeapUI service worker iniciado');

// Escutar quando a extensão é instalada
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('LeapUI instalado com sucesso!');
        console.log('Pressione Alt+I em qualquer página para começar a usar.');
    }
});

// Escutar comandos de keyboard shortcuts (se configurado no manifest)
chrome.commands?.onCommand?.addListener((command) => {
    if (command === 'toggle-selector') {
        // Enviar mensagem para o content script na aba ativa
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'toggle-selector'});
            }
        });
    }
});

// Escutar clicks no ícone da extensão
chrome.action.onClicked.addListener((tab) => {
    // Enviar mensagem para togglear o seletor
    chrome.tabs.sendMessage(tab.id, {action: 'toggle-selector'});
});

// Escutar mensagens dos content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'get-status':
            // Retornar status da extensão
            sendResponse({status: 'active'});
            break;
            
        case 'log-element':
            // Log de elemento selecionado (para debugging)
            console.log('Elemento selecionado:', message.element);
            break;
            
        default:
            console.log('Mensagem não reconhecida:', message);
    }
});

// Monitorar mudanças de aba para limpar estado se necessário
chrome.tabs.onActivated.addListener((activeInfo) => {
    // Opcional: limpar estado quando mudar de aba
    console.log('Aba ativa mudou:', activeInfo.tabId);
});

// Função utilitária para injetar o content script em abas existentes (se necessário)
function injectContentScript(tabId) {
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['content.js']
    }).catch((error) => {
        console.error('Erro ao injetar content script:', error);
    });
}