// ==========================================
// PONTOVIGIA • STANDBY & ADM CONTROLLER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    verificarEstadoManutencaoAoIniciar();
});

function tentarAbrirMenuDev() {
    const sidebar = document.getElementById('devSidebar');
    const overlay = document.getElementById('devOverlay');
    const overlayManutencao = document.getElementById('overlayManutencaoGlobal');

    // Se estiver em manutenção, esconde temporariamente o aviso para dar lugar ao painel ADM
    if (overlayManutencao) {
        overlayManutencao.style.display = 'none';
    }

    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function fecharMenuDev() {
    const sidebar = document.getElementById('devSidebar');
    const overlay = document.getElementById('devOverlay');
    const emManutencao = localStorage.getItem('pontovigia_manutencao') === 'true';
    const overlayManutencao = document.getElementById('overlayManutencaoGlobal');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    // Se o sistema estiver em manutenção e o adm fechar o menu sem desativar, volta a tela de manutenção
    if (emManutencao && overlayManutencao) {
        overlayManutencao.style.display = 'flex';
    }
}

function tentarLogarAdm() {
    const senhaInput = document.getElementById('inputSenhaAdm').value;
    // Senhas aceitas para gerenciar o painel
    if (senhaInput === 'admin123' || senhaInput === 'vitor2026') {
        document.getElementById('painelLoginAdm').style.display = 'none';
        document.getElementById('conteudoProtegidoAdm').style.display = 'block';
        document.getElementById('inputSenhaAdm').value = '';
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
        alert('⚠️ Modo Manutenção ATIVADO com sucesso. O sistema agora bloqueará novas interações normais.');
        aplicarTelaManutencao(true);
    } else {
        alert('🛠️ Modo Manutenção DESATIVADO. O sistema voltou à operação normal.');
        aplicarTelaManutencao(false);
    }
}

function verificarEstadoManutencaoAoIniciar() {
    const emManutencao = localStorage.getItem('pontovigia_manutencao') === 'true';
    if (emManutencao) {
        aplicarTelaManutencao(true);
    }
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
                <p style="font-size:14px;color:#94a3b8;max-width:320px;margin-bottom:20px;">O aplicativo PontoVigia está passando por atualizações programadas pela administração.</p>
                <button onclick="tentarAbrirMenuDev()" style="background:#3b82f6;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer;box-shadow: 0 4px 12px rgba(59,130,246,0.4);">Abrir Painel ADM</button>
            `;
            document.body.appendChild(overlayManutencao);
        } else {
            overlayManutencao.style.display = 'flex';
        }
    } else {
        if (overlayManutencao) {
            overlayManutencao.style.display = 'none';
        }
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
    if (confirm('⚠️ ATENÇÃO: Isso vai apagar todos os dados locais do aplicativo. Tem certeza?')) {
        localStorage.clear();
        location.reload();
    }
}
