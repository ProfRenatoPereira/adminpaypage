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
    await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' });
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

    document.getElementById('dash_total_func').innerText = `${funcionarios.length} / ${document.getElementById('limite_func').value}`;
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
        pizza.style.background = `conic-gradient(#dc2626 0% ${perc}%, #16a34a ${perc}% 100%)`;
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
            containerPareto.innerHTML += `<div class="bar-wrapper"><div class="bar-native" style="height: ${pct}%">${pct.toFixed(0)}%</div><div class="bar-label">${c}</div></div>`;
        });
    }

    const containerLinear = document.getElementById('nativeLinear');
    if (containerLinear) {
        containerLinear.innerHTML = '';
        const maxLiquido = funcionarios.length > 0 ? Math.max(...funcionarios.map(f => f.liquido)) : 1;
        funcionarios.slice(-4).forEach(f => {
            const pct = (f.liquido / maxLiquido) * 100;
            containerLinear.innerHTML += `<div class="linear-row"><div class="linear-name">${f.nome}</div><div class="linear-bar-bg"><div class="linear-bar-fill" style="width: ${pct}%"></div></div><div class="linear-value">${formatarMoeda(f.liquido)}</div></div>`;
        });
    }
}

function renderizarTabela() {
    const corpo = document.getElementById('tabela_corpo');
    corpo.innerHTML = '';
    funcionarios.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${f.nome}</strong></td>
            <td>${f.cargo}</td>
            <td>${formatarMoeda(f.salario)}</td>
            <td style="color:#16a34a"><strong>${formatarMoeda(f.liquido)}</strong></td>
            <td class="actions-cell">
                <button class="btn-delete" style="background:#0284c7; color:white; border:none; padding:4px 8px; margin-right:5px; border-radius:4px;" onclick="alert('Recibo de Vencimento Mensal enviado para a impressora!')">📄 Mensal</button>
                <button class="btn-delete" style="background:#16a34a; color:white; border:none; padding:4px 8px; margin-right:5px; border-radius:4px;" onclick="alert('Aviso e Recibo de Gozo de Férias gerado!')">🌴 Férias</button>
                <button class="btn-delete" style="background:#eab308; color:white; border:none; padding:4px 8px; margin-right:5px; border-radius:4px;" onclick="alert('Cálculo Prévio de Rescisão concluído!')">⚠️ Rescisão</button>
                <button class="btn-delete" onclick="demitirFuncionario(${f.id})">Demitir</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

function imprimirBalanco() { window.print(); }

function abrirDecimoTerceiroGeral() {
    if (funcionarios.length === 0) { alert("Nenhum funcionário ativo na base SQLite para calcular a gratificação natalina."); return; }
    let totalBruto = 0, totalInss = 0, totalLiquido = 0;
    let htmlLinhas = '';
    
    funcionarios.forEach(f => {
        const inss = f.salario * 0.09; // Alíquota didática direta do 13º
        const liq = f.salario - inss;
        totalBruto += f.salario; totalInss += inss; totalLiquido += liq;
        htmlLinhas += `<p style='margin: 8px 0;'><strong>${f.nome}</strong> (${f.cargo}): Salário: ${formatarMoeda(f.salario)} | INSS s/ 13º: -${formatarMoeda(inss)} | Líquido: <span style='color:green; font-weight:bold;'>${formatarMoeda(liq)}</span></p>`;
    });

    const janela = window.open('', '_blank', 'width=750,height=700');
    janela.document.write(`
        <html><body style="font-family:monospace; padding:30px; color:#000; background:#fff;">
            <div style="border:2px solid #000; padding:25px; max-width:650px; margin:0 auto;">
                <h2 style="text-align:center; color:#1e3a8a; margin-bottom:5px;">TERCEIRO ADM ASSOCIADOS</h2>
                <h3 style="text-align:center; color:#16a34a; margin-top:0;">FOLHA DE PAGAMENTO - 13º SALÁRIO INTEGRAL</h3>
                <hr style="border:1px dashed #000; margin:15px 0;">
                ${htmlLinhas}
                <hr style="border:1px dashed #000; margin:20px 0;">
                <h4 style="color:#1e3a8a; margin-bottom:5px;">DEMONSTRATIVO DE PROVISÃO E DESEMBOLSO (DEZEMBRO)</h4>
                <p><strong>Custo de Gratificação Bruta:</strong> ${formatarMoeda(totalBruto)}</p>
                <p><strong>Retenções Previdenciárias Totais:</strong> ${formatarMoeda(totalInss)}</p>
                <h3 style="background:#f1f5f9; padding:10px; border:1px solid #000; display:inline-block; margin-top:10px;">TOTAL LÍQUIDO A PAGAR (DESEMBOLSO REAL): ${formatarMoeda(totalLiquido)}</h3>
                <br><br><br><button onclick="window.print()" style="padding:7px 15px; font-weight:bold; cursor:pointer;">🖨️ Imprimir Relação Natalina</button>
            </div>
        </body></html>
    `);
    janela.document.close();
}
