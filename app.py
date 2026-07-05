from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)
DB_FILE = 'folha_v4_estavel.db' # Novo banco para mapear os novos cargos sem conflito

def iniciar_banco():
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, cargo TEXT, salario REAL, horas_comp REAL, insalubridade REAL,
            beneficios REAL, qtd_filhos INTEGER, observacoes TEXT, data_admissao TEXT, mes_ref TEXT,
            he_semana REAL, he_sabado REAL, he_domingo REAL, total_he_ganho REAL,
            reflexo_13_ferias REAL, salario_familia REAL, inss REAL, irrf REAL, vt REAL,
            adiantamento_valor REAL, total_descontos REAL, liquido REAL
        )
    ''')
    conexao.commit()
    conexao.close()

def calcular_inss(salario_contribuicao):
    if salario_contribuicao <= 1412: return salario_contribuicao * 0.075
    if salario_contribuicao <= 2666.68: return (salario_contribuicao * 0.09) - 21.18
    if salario_contribuicao <= 4000.03: return (salario_contribuicao * 0.12) - 101.18
    if salario_contribuicao <= 7786.02: return (salario_contribuicao * 0.14) - 181.18
    return 908.86

def calcular_irrf(salario_contribuicao, desconto_inss):
    base = salario_contribuicao - desconto_inss
    if base <= 2259.20: return 0
    if base <= 2826.65: return (base * 0.075) - 169.44
    if base <= 3751.05: return (base * 0.15) - 381.44
    if base <= 4664.68: return (base * 0.225) - 662.77
    return (base * 0.275) - 896.00

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/funcionarios', methods=['GET'])
def listar_funcionarios():
    conexao = sqlite3.connect(DB_FILE)
    conexao.row_factory = sqlite3.Row
    cursor = conexao.cursor()
    cursor.execute('SELECT * FROM funcionarios')
    linhas = cursor.fetchall()
    conexao.close()
    return jsonify([dict(linha) for linha in linhas])

@app.route('/api/funcionarios/<int:id_func>', methods=['DELETE'])
def demitir_funcionario(id_func):
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    cursor.execute('DELETE FROM funcionarios WHERE id = ?', (id_func,))
    conexao.commit()
    conexao.close()
    return jsonify({'status': 'removido'})

@app.route('/api/calcular', methods=['POST'])
def calcular_e_salvar():
    dados = request.json
    salario_base = float(dados.get('salario', 0))
    horas_comp = float(dados.get('horasComp', 220)) or 220
    beneficios = float(dados.get('beneficios', 0))
    insalubridade = float(dados.get('insalubridade', 0))
    qtd_filhos = int(dados.get('qtdFilhos', 0))
    nome = dados.get('nome', '').strip()
    cargo = dados.get('cargo', '')
    observacoes = dados.get('observacoes', '')
    data_admissao = dados.get('dataAdmissao', '')
    mes_ref = dados.get('mesRef', '')
    
    he_semana = float(dados.get('heSemana', 0))
    he_sabado = float(dados.get('heSabado', 0))
    he_domingo = float(dados.get('heDomingo', 0))
    sindicato = float(dados.get('sindicato', 0))
    plano_saude = float(dados.get('planoSaude', 0))
    plano_odonto = float(dados.get('planoOdonto', 0))
    vale_farmacia = float(dados.get('valeFarmacia', 0))
    aplicar_adiantamento = dados.get('adiantamento', 'nao') == 'sim'
    descontar_vt = dados.get('vt', 'nao') == 'sim'
    
    valor_hora = salario_base / horas_comp
    v_he_semana = he_semana * (valor_hora * 1.25)
    v_he_sabado = he_sabado * (valor_hora * 1.50)
    v_he_domingo = he_domingo * (valor_hora * 2.00)
    total_he_ganho = v_he_semana + v_he_sabado + v_he_domingo
    reflexo_13_ferias = total_he_ganho * (2.0 / 12.0)
    
    total_salario_familia = qtd_filhos * 62.04 if salario_base <= 1819.26 and qtd_filhos > 0 else 0
    salario_contribuicao = salario_base + total_he_ganho + insalubridade + reflexo_13_ferias
    inss = calcular_inss(salario_contribuicao)
    irrf = calcular_irrf(salario_contribuicao, inss)
    vt = salario_base * 0.06 if descontar_vt else 0
    
    proventos_totais = salario_base + beneficios + total_he_ganho + insalubridade + reflexo_13_ferias + total_salario_familia
    descontos_totais = inss + irrf + vt + sindicato + plano_saude + plano_odonto + vale_farmacia
    valor_adiantamento = (proventos_totais - descontos_totais) * 0.40 if aplicar_adiantamento else 0
    total_descontos_final = descontos_totais + valor_adiantamento
    liquido_final = proventos_totais - total_descontos_final
    
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    cursor.execute('''
        INSERT INTO funcionarios (nome, cargo, salario, horas_comp, insalubridade, beneficios, qtd_filhos, 
        observacoes, data_admissao, mes_ref, he_semana, he_sabado, he_domingo, total_he_ganho, 
        reflexo_13_ferias, salario_familia, inss, irrf, vt, adiantamento_valor, total_descontos, liquido)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (nome, cargo, salario_base, horas_comp, insalubridade, beneficios, qtd_filhos, observacoes, data_admissao, mes_ref, 
          he_semana, he_sabado, he_domingo, total_he_ganho, reflexo_13_ferias, total_salario_familia, inss, irrf, vt, valor_adiantamento, total_descontos_final, liquido_final))
    conexao.commit()
    conexao.close()
    return jsonify({'status': 'sucesso'})

iniciar_banco()
if __name__ == '__main__':
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta, debug=True)
