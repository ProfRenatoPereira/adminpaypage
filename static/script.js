let funcionarios = [];

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.addEventListener('DOMContentLoaded', () => {
    carregarDadosBanco();
    document.getElementById('btn_adicionar')?.addEventListener('click', adicionarFuncionario);
    document.getElementById('btn_imprimir_balanco')?.addEventListener('click', imprimirBalanco);
    document.getElementById('btn_folha_13')?.addEventListener('click', abrirDecimoTerceiroGeral);
    document.getElementById('btn_imprimir_listagem')?.addEventListener('click', () => window.print());
    document.getElementById('receita_empresa')?.addEventListener('change', atualizarDashboard);
    document.getElementById('limite_func')?.addEventListener('change', atualizarDashboard);
});

async function carregarDadosBanco() {
    const resposta = await fetch('/api/funcionarios');
    funcionarios = await resposta.json();
    renderizarTabela();
    atualizarDashboard();
}

async function adicionarFuncionario() {
    const nome = document.getElementById('nome').value.trim();
    const cargo = document.getElementById('cargo').value;
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    const horasComp = parseFloat(document.getElementById('horas_comp').value) || 220;
    const insalubridade = parseFloat(document.getElementById('insalubridade').value) || 0;
    const beneficios = parseFloat(document.getElementById('beneficios').value) || 0;
    const qtdFilhos = parseInt(document.getElementById('qtd_filhos').value) || 0;
    const observacoes = document.getElementById('observacoes').value.trim();
    const dataAdmissao = document.getElementById('data_admissao').value;
    const heSemana = parseFloat(document.getElementById('he_semana').value) || 0;
    const heSabado = parseFloat(document.getElementById('he_sabado').value) || 0;
    const heDomingo = parseFloat(document.getElementById('he_domingo').value) || 0;
    const planoSaude = parseFloat(document.getElementById('plano_saude').value) || 0;
    const planoOdonto = parseFloat(document.getElementById('plano_odonto').value) || 0;
    const valeFarmacia = parseFloat(document.getElementById('vale_farmacia').value) || 0;
    const sindicato = parseFloat(document.getElementById('sindicato').value) || 0;
    const adiantamento = document.getElementById('adiantamento').value;
    const vt = document.getElementById('vt_desconto').value;
    const mesRef = document.getElementById('mes_referencia').value;

    if (!nome) { alert('Insira o nome do profissional.'); return; }
    await fetch('/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            nome, cargo, salario, horasComp, insalubridade, beneficios, heSemana, heSabado, heDomingo,
            planoSaude, planoOdonto, valeFarmacia, sindicato, adiantamento, vt, qtdFilhos, mesRef
        })
    });
    document.getElementById('nome').value = '';
    carregarDadosBanco();
}

async function demitirFuncionario(id) {
    await fetch('/api/funcionarios/' + id, { method: 'DELETE' });
    carregarDadosBanco();
}

function atualizarDashboard() {
    const receita = parseFloat(document.getElementById('receita_empresa').value) || 0;
    let totalBruto = 0, totalDescontos = 0, totalLiquido = 0;
    funcionarios.forEach(f => {
        totalBruto += f.salario + f.total_he_ganho + f.insalubridade + f.reflexo_13_ferias;
        totalDescontos += f.total_descontos;
        totalLiquido += f.liquido;
    });
    let custoTotal = funcionarios.reduce((acc, f) => acc + f.salario + f.beneficios + f.total_he_ganho + f.insalubridade + f.reflexo_13_ferias, 0);
    let saldoFinal = receita - custoTotal;
    document.getElementById('dash_total_func').innerText = funcionarios.length + ' / ' + document.getElementById('limite_func').value;
    document.getElementById('dash_custo_bruto').innerText = formatarMoeda(totalBruto);
    document.getElementById('dash_total_descontos').innerText = formatarMoeda(totalDescontos);
    document.getElementById('dash_folha_liquida').innerText = formatarMoeda(totalLiquido);
    document.getElementById('dash_saldo_empresa').innerText = formatarMoeda(saldoFinal);
    document.getElementById('card_balanco').className = saldoFinal < 0 ? 'metric negative' : 'metric';
    renderizarGraficosNativos(totalLiquido, totalDescontos);
}
function renderizarGraficosNativos(liquido, descontos) {
    const total = liquido + descontos;
    const pizza = document.getElementById('nativePizza');
    if (pizza) {
        const perc = total > 0 ? ((descontos / total) * 100).toFixed(1) : 0;
        pizza.style.background = "conic-gradient(#dc2626 0% " + perc + "%, #16a34a " + perc + "% 100%)";
    }
    const custosCargo = {};
    funcionarios.forEach(f => custosCargo[f.cargo] = (custosCargo[f.cargo] || 0) + f.salario);
    const cargos = Object.keys(custosCargo).sort((a,b) => custosCargo[b] - custosCargo[a]);
    const maxCusto = cargos.length > 0 ? custosCargo[cargos] : 1;
    const containerPareto = document.getElementById('nativePareto');
    if (containerPareto) {
        containerPareto.innerHTML = '';
        cargos.slice(0, 4).forEach(c => {
            const pct = (custosCargo[c] / maxCusto) * 100;
            containerPareto.innerHTML += '<div class="bar-wrapper"><div class="bar-native" style="height: ' + pct + '%">' + pct.toFixed(0) + '%</div><div class="bar-label">' + c + '</div></div>';
        });
    }
    const containerLinear = document.getElementById('nativeLinear');
    if (containerLinear) {
        containerLinear.innerHTML = '';
        const maxLiquido = funcionarios.length > 0 ? Math.max(...funcionarios.map(f => f.liquido)) : 1;
        funcionarios.slice(-4).forEach(f => {
            const pct = (f.liquido / maxLiquido) * 100;
            containerLinear.innerHTML += '<div class="linear-row"><div class="linear-name">' + f.nome + '</div><div class="linear-bar-bg"><div class="linear-bar-fill" style="width: ' + pct + '%"></div></div><div class="linear-value">' + formatarMoeda(f.liquido) + '</div></div>';
        });
    }
}

function renderizarTabela() {
    const corpo = document.getElementById('tabela_corpo');
    if (!corpo) return; corpo.innerHTML = '';
    funcionarios.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td><strong>' + f.nome + '</strong></td><td>' + f.cargo + '</td><td>' + formatarMoeda(f.salario) + '</td><td style="color:#16a34a"><strong>' + formatarMoeda(f.liquido) + '</strong></td><td><button class="btn-delete" style="background:#0284c7; color:white; border:none; padding:4px 8px; margin-right:3px; border-radius:4px;" onclick="abrirContracheque(' + f.id + ')">📄 Mensal</button><button class="btn-delete" style="background:#16a34a; color:white; border:none; padding:4px 8px; margin-right:3px; border-radius:4px;" onclick="abrirFerias(' + f.id + ')">🌴 Férias</button><button class="btn-delete" style="background:#b91c1c; color:white; border:none; padding:4px 8px; margin-right:3px; border-radius:4px;" onclick="emitirRescisaoExecutiva(' + f.id + ', \'demissao_sem_justa\')">⚠️ Sem Justa</button><button class="btn-delete" style="background:#ea580c; color:white; border:none; padding:4px 8px; margin-right:3px; border-radius:4px;" onclick="emitirRescisaoExecutiva(' + f.id + ', \'pedido_demissao\')">跑 Pedido</button><button class="btn-delete" onclick="demitirFuncionario(' + f.id + ')">Demitir</button></td>';
        corpo.appendChild(tr);
    });
}

function abrirContracheque(id) {
    const f = funcionarios.find(emp => emp.id === id); if(!f) return;
    const proventosTotais = f.salario + f.total_he_ganho + f.insalubridade + f.reflexo_13_ferias;
    const janela = window.open('', '_blank', 'width=750,height=850');
    janela.document.write("<html><body style='font-family:monospace; padding:25px;'><h2>RECIBO MENSAL</h2><hr><p><strong>Colaborador:</strong> " + f.nome + "</p><p><strong>Cargo:</strong> " + f.cargo + "</p><p><strong>Líquido:</strong> " + formatarMoeda(f.liquido) + "</p></body></html>");
    janela.document.close();
}

function abrirFerias(id) {
    const f = funcionarios.find(emp => emp.id === id); if(!f) return;
    const baseFerias = f.salario + f.insalubridade;
    const janela = window.open('', '_blank', 'width=750,height=700');
    janela.document.write("<html><body style='font-family:monospace; padding:30px;'><h2>RECIBO DE FÉRIAS</h2><hr><p><strong>Colaborador:</strong> " + f.nome + "</p><p><strong>Líquido:</strong> " + formatarMoeda((baseFerias + (baseFerias/3)) * 0.91) + "</p></body></html>");
    janela.document.close();
}

async function emitirRescisaoExecutiva(id, tipo) {
    const f = funcionarios.find(emp => emp.id === id); if(!f) return;
    const resposta = await fetch('/api/rescisao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salario: f.salario, admissao: f.data_admissao, tipoRescisao: tipo }) });
    const r = await resposta.json();
    const janela = window.open('', '_blank', 'width=750,height=850');
    janela.document.write("<html><body style='font-family:monospace; padding:30px;'><h2>TERMO DE RESCISÃO CLT</h2><hr><p><strong>Causa:</strong> " + (tipo === 'pedido_demissao' ? 'Pedido de Demissão' : 'Dispensa sem Justa Causa') + "</p><p><strong>Saldo Líquido:</strong> " + formatarMoeda(r.liquido) + "</p></body></html>");
    janela.document.close();
}

function abrirDecimoTerceiroGeral() {
    if (funcionarios.length === 0) { alert("Nenhum funcionário ativo."); return; }
    let totalLiquido = 0; funcionarios.forEach(f => { totalLiquido += (f.salario * 0.91); });
    const janela = window.open('', '_blank', 'width=750,height=700');
    janela.document.write("<html><body style='font-family:monospace; padding:30px;'><h2>FOLHA DE 13º SALÁRIO INTEGRAL</h2><hr><h3>TOTAL LÍQUIDO A PAGAR: " + formatarMoeda(totalLiquido) + "</h3></body></html>");
    janela.document.close();
}

function imprimirBalanco() { window.print(); }
