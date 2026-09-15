// ==========================================
// PONTOVIGIA • UPDATER & CHECKER
// ==========================================

const VERSAO_APP_ATUAL = "2.9";
let linkDownloadAppGlobal = "#";

document.addEventListener('DOMContentLoaded', () => {
    // Executa a checagem após 1.5 segundos para garantir carregamento fluido
    setTimeout(() => {
        verificarAtualizacoesWebTwin();
    }, 1500);
});

function verificarAtualizacoesWebTwin() {
    // URL simulada/direcionada para o seu servidor ou Web Twin (ajuste se necessário)
    const urlVersaoServidor = "versao.json";

    fetch(`${urlVersaoServidor}?t=${new Date().getTime()}`)
        .then(response => response.json())
        .then(data => {
            if (data.versao && data.versao !== VERSAO_APP_ATUAL) {
                mostrarModalAtualizacao(data);
            }
        })
        .catch(err => {
            console.log("Sistema offline ou erro ao checar atualização remota:", err);
        });
}

function mostrarModalAtualizacao(dados) {
    const txtAtual = document.getElementById('txtVersaoAtual');
    const txtNova = document.getElementById('txtVersaoNova');
    const modal = document.getElementById('updateModal');
    
    if (txtAtual) txtAtual.textContent = VERSAO_APP_ATUAL;
    if (txtNova) txtNova.textContent = dados.versao;
    linkDownloadAppGlobal = dados.linkAtualizacao || "#";

    const lista = document.getElementById('listaNovidades');
    if (lista && dados.novidades && Array.isArray(dados.novidades)) {
        lista.innerHTML = '';
        dados.novidades.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            lista.appendChild(li);
        });
    }

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function fecharModalAtualizacao() {
    const modal = document.getElementById('updateModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function executarAtualizacao() {
    if (linkDownloadAppGlobal && linkDownloadAppGlobal !== "#") {
        window.location.href = linkDownloadAppGlobal;
    } else {
        alert("O sistema já está utilizando a versão mais recente ou o link de download está indisponível.");
        fecharModalAtualizacao();
    }
}
