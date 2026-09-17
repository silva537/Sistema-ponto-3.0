// ==========================================
// PONTOVIGIA • STANDBY & ADM CONTROLLER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    verificarEstadoManutencaoAoIniciar();
    carregarConfigWebhook();
    carregarFundoPersonalizadoSalvo();
});

function tentarAbrirMenuDev() {
    const sidebar = document.getElementById('devSidebar');
    const overlay = document.getElementById('devOverlay');
    const overlayManutencao = document.getElementById('overlayManutencaoGlobal');

    if (overlayManutencao) overlayManutencao.style.display = 'none';
    if (sidebar) sidebar.classList.add('open', 'active');
    if (overlay) overlay.classList.add('open', 'active');
}

function fecharMenuDev() {
    const sidebar = document.getElementById('devSidebar');
    const overlay = document.getElementById('devOverlay');
    const emManutencao = localStorage.getItem('pontovigia_manutencao') === 'true';
    const overlayManutencao = document.getElementById('overlayManutencaoGlobal');

    if (sidebar) sidebar.classList.remove('open', 'active');
    if (overlay) overlay.classList.remove('open', 'active');

    if (emManutencao && overlayManutencao) {
        overlayManutencao.style.display = 'flex';
    }
}

function tentarLogarAdm() {
    const senhaInput = document.getElementById('inputSenhaAdm').value;
    if (senhaInput === 'admin123' || senhaInput === 'vitor2026') {
        document.getElementById('painelLoginAdm').style.display = 'none';
        document.getElementById('conteudoProtegidoAdm').style.display = 'block';
        document.getElementById('inputSenhaAdm').value = '';
        carregarConfigWebhook();
    } else {
        alert('Senha de administrador incorreta.');
    }
}

function logoutAdm() {
    document.getElementById('painelLoginAdm').style.display = 'block';
    document.getElementById('conteudoProtegidoAdm').style.display = 'none';
}

function alternarModoManutencao() {
    const statusManutencao = localStorage.getItem('pontovigia_manutencao') === 'true';
    const novoStatus = !statusManutencao;
    
    localStorage.setItem('pontovigia_manutencao', novoStatus);
    
    if (novoStatus) {
        alert('⚠️ Modo Manutenção ATIVADO com sucesso.');
        aplicarTelaManutencao(true);
    } else {
        alert('🛠️ Modo Manutenção DESATIVADO.');
        aplicarTelaManutencao(false);
    }
}

function verificarEstadoManutencaoAoIniciar() {
    const emManutencao = localStorage.getItem('pontovigia_manutencao') === 'true';
    if (emManutencao) aplicarTelaManutencao(true);
}

function aplicarTelaManutencao(ativar) {
    let overlayManutencao = document.getElementById('overlayManutencaoGlobal');
    
    if (ativar) {
        if (!overlayManutencao) {
            overlayManutencao = document.createElement('div');
            overlayManutencao.id = 'overlayManutencaoGlobal';
            overlayManutencao.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#0f172a;z-index:99999;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#f8fafc;padding:20px;text-align:center;";
            overlayManutencao.innerHTML = `
                <h1 style="font-size:24px;color:#f59e0b;margin-bottom:10px;">🛠️ Sistema em Manutenção</h1>
                <p style="font-size:14px;color:#94a3b8;max-width:320px;margin-bottom:20px;">O aplicativo PontoVigia está passando por atualizações programadas.</p>
                <button onclick="tentarAbrirMenuDev()" style="background:#3b82f6;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer;">Abrir Painel ADM</button>
            `;
            document.body.appendChild(overlayManutencao);
        } else {
            overlayManutencao.style.display = 'flex';
        }
    } else {
        if (overlayManutencao) overlayManutencao.style.display = 'none';
    }
}

function dispararTesteAtualizacao() {
    const versaoTesteFicticia = "3.2-beta";
    const mensagemTeste = "Nova versão de teste liberada com melhorias no fluxo administrativo.";
    if (typeof exibirModalAtualizacao === 'function') {
        exibirModalAtualizacao(versaoTesteFicticia, mensagemTeste);
        fecharMenuDev();
    } else {
        alert('Módulo de atualização não encontrado.');
    }
}

function exportarBackupJSON() {
    const dadosGerais = {
        plantoes: JSON.parse(localStorage.getItem('pontovigia_plantoes')) || [],
        folhas: JSON.parse(localStorage.getItem('pontovigia_folhas')) || [],
        meta: localStorage.getItem('pontovigia_meta') || 1000
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosGerais, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_pontovigia_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importarBackupJSON() {
    document.getElementById('fileJsonInput').click();
}

function processarImportacaoJSON(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const conteudo = JSON.parse(e.target.result);
            if (conteudo.plantoes) {
                localStorage.setItem('pontovigia_plantoes', JSON.stringify(conteudo.plantoes));
                localStorage.setItem('pontovigia_folhas', JSON.stringify(conteudo.folhas || []));
                if (conteudo.meta) localStorage.setItem('pontovigia_meta', conteudo.meta);
                alert('Backup restaurado com sucesso! A página será recarregada.');
                location.reload();
            } else {
                alert('Arquivo de backup inválido.');
            }
        } catch (err) {
            alert('Erro ao processar o arquivo JSON.');
        }
    };
    leitor.readAsText(arquivo);
}

function limparBancoDadosLocal() {
    if (confirm('⚠️ ATENÇÃO: Isso vai apagar todos os dados locais. Tem certeza?')) {
        localStorage.clear();
        location.reload();
    }
}

// Configuração de Webhook
function carregarConfigWebhook() {
    const inputWebhook = document.getElementById('inputWebhookUrl');
    if (inputWebhook) {
        inputWebhook.value = localStorage.getItem('nexus_webhook_url') || '';
    }
}

function salvarWebhookUrl() {
    const inputWebhook = document.getElementById('inputWebhookUrl');
    if (!inputWebhook) return;
    localStorage.setItem('nexus_webhook_url', inputWebhook.value.trim());
    alert("✅ URL do Webhook salva com sucesso!");
}

async function testarEnvioWebhook() {
    const url = localStorage.getItem('nexus_webhook_url');
    if (!url) {
        alert("⚠️ Nenhuma URL de Webhook configurada.");
        return;
    }

    try {
        const resposta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: "🚨 **PONTOVIGIA • Teste de Webhook**\nO sistema de alertas foi conectado com sucesso!" })
        });
        if (resposta.ok || resposta.status === 204) {
            alert("🚀 Mensagem de teste disparada com sucesso!");
        } else {
            alert("⚠️ O webhook respondeu com erro. Verifique a URL.");
        }
    } catch (erro) {
        alert("❌ Falha de rede ao tentar conectar com o Webhook.");
    }
}

// Customização Visual (Fundo / Cabeçalho)
function salvarFundoPersonalizado() {
    const urlInput = document.getElementById('inputUrlFundoDev').value.trim();
    if (!urlInput) {
        alert('Por favor, insira o link de uma imagem ou GIF válido.');
        return;
    }
    localStorage.setItem('pontovigia_custom_bg', urlInput);
    aplicarFundoNoCabecalho(urlInput);
    document.getElementById('inputUrlFundoDev').value = '';
    alert('🎨 Fundo aplicado com sucesso no cabeçalho!');
    fecharMenuDev();
}

function carregarFundoPersonalizadoSalvo() {
    const bgSalvo = localStorage.getItem('pontovigia_custom_bg');
    if (bgSalvo) aplicarFundoNoCabecalho(bgSalvo);
}

function aplicarFundoNoCabecalho(url) {
    const header = document.getElementById('appHeaderCustom');
    if (header) {
        header.style.backgroundImage = `linear-gradient(to bottom, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('${url}')`;
    }
}

function removerFundoPersonalizado() {
    localStorage.removeItem('pontovigia_custom_bg');
    const header = document.getElementById('appHeaderCustom');
    if (header) header.style.backgroundImage = 'none';
    alert('🗑️ Fundo personalizado removido.');
    fecharMenuDev();
}

const scriptModulosAdm = document.createElement('script');
scriptModulosAdm.src = 'dev_modules.js';
document.head.appendChild(scriptModulosAdm);
