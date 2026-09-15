// ==========================================
// PONTOVIGIA • ATUALIZADOR AUTOMÁTICO
// ==========================================

const VERSAO_ATUAL = "3.0"; // Mude sempre que lançar uma grande atualização física
const URL_VERIFICACAO_VERSAO = "https://raw.githubusercontent.com/silva537/Sistema-ponto-3.0/principais/versao.json";

document.addEventListener('DOMContentLoaded', () => {
    verificarAtualizacoesDisponiveis();
});

async function verificarAtualizacoesDisponiveis() {
    try {
        // Adiciona um timestamp para evitar cache agressivo do navegador/webview
        const resposta = await fetch(`${URL_VERIFICACAO_VERSAO}?t=${new Date().getTime()}`);
        if (!resposta.ok) return;

        const dados = await resposta.json();
        
        if (dados.versao && dados.versao !== VERSAO_ATUAL) {
            exibirAvisoAtualizacao(dados.versao, dados.mensagem);
        }
    } catch (error) {
        // Silencia erros de conexão offline para não atrapalhar o uso comum
        console.log("Modo offline ou falha ao checar atualizações:", error);
    }
}

function exibirAvisoAtualizacao(novaVersao, mensagem) {
    // Evita criar duplicado se já existir
    if (document.getElementById('bannerAtualizacaoGlobal')) return;

    const banner = document.createElement('div');
    banner.id = 'bannerAtualizacaoGlobal';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #3b82f6;
        padding: 16px;
        border-radius: 12px;
        z-index: 999999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: left;
        animation: slideUp 0.3s ease-out;
    `;

    banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #3b82f6; font-size: 14px;">🚀 Nova Versão Disponível (${novaVersao})</strong>
            <span style="font-size: 11px; background: #334155; padding: 2px 6px; border-radius: 4px; color: #94a3b8;">Automático</span>
        </div>
        <p style="font-size: 12px; color: #cbd5e1; margin: 0;">${mensagem || 'Há melhorias e correções prontas para uso.'}</p>
        <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button onclick="aplicarAtualizacaoApp()" style="flex: 2; background: #3b82f6; color: #fff; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">Atualizar Agora</button>
            <button onclick="fecharAvisoAtualizacao()" style="flex: 1; background: transparent; color: #94a3b8; border: 1px solid #475569; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">Depois</button>
        </div>
    `;

    document.body.appendChild(banner);
}

function aplicarAtualizacaoApp() {
    // Força a limpeza do cache e recarrega a página/webview buscando a versão mais recente do GitHub
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        });
    }
    alert('Atualizando sistema...');
    window.location.reload(true);
}

function fecharAvisoAtualizacao() {
    const banner = document.getElementById('bannerAtualizacaoGlobal');
    if (banner) banner.remove();
            }
