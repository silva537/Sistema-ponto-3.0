// VERSÃO ATUAL DO SEU APLICATIVO LOCAL
const VERSAO_APP_ATUAL = "2.8";
let linkDownloadAppGlobal = "#";

document.addEventListener('DOMContentLoaded', () => {
    // ... seus códigos anteriores ...
    verificarAtualizacoesWebTwin();
});

function verificarAtualizacoesWebTwin() {
    // URL do arquivo versao.json hospedado no seu Web Twin / Servidor
    const urlVersaoServidor = "https://seu-web-twin.com/versao.json";

    // Adicionamos um timestamp (?t=...) para evitar que o navegador traga cache antigo
    fetch(`${urlVersaoServidor}?t=${new Date().getTime()}`)
        .then(response => response.json())
        .then(data => {
            if (data.versao && data.versao !== VERSAO_APP_ATUAL) {
                // Se a versão do servidor for diferente/maior, exibe o pop-up
                mostrarModalAtualizacao(data);
            }
        })
        .catch(err => {
            console.log("Sistema offline ou erro ao checar atualização:", err);
        });
}

function mostrarModalAtualizacao(dados) {
    document.getElementById('txtVersaoAtual').textContent = VERSAO_APP_ATUAL;
    document.getElementById('txtVersaoNova').textContent = dados.versao;
    linkDownloadAppGlobal = dados.linkAtualizacao;

    const lista = document.getElementById('listaNovidades');
    lista.innerHTML = '';
    
    if (dados.novidades && Array.isArray(dados.novidades)) {
        dados.novidades.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            lista.appendChild(li);
        });
    }

    document.getElementById('updateModal').classList.add('active');
}

function fecharModalAtualizacao() {
    document.getElementById('updateModal').classList.remove('active');
}

function executarAtualizacao() {
    if (linkDownloadAppGlobal && linkDownloadAppGlobal !== "#") {
        window.location.href = linkDownloadAppGlobal;
    } else {
        alert("Link de atualização indisponível no momento.");
    }
}
