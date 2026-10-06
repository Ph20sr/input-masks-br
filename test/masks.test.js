import { test } from 'node:test';
import assert from 'node:assert/strict';
import { format, formatPattern, applyMask, deleteBackward, unmask } from '../src/masks.js';

test('formatPattern só insere literais quando há valor depois', () => {
  assert.equal(formatPattern('123', '000.000'), '123');
  assert.equal(formatPattern('1234', '000.000'), '123.4');
  assert.equal(formatPattern('12a34', '000.000'), '123.4', 'ignora o que o token não aceita');
});

test('CPF, CEP, data e cartão', () => {
  assert.equal(format('52998224725', 'cpf'), '529.982.247-25');
  assert.equal(format('529.982.247-25999', 'cpf'), '529.982.247-25', 'limita o tamanho');
  assert.equal(format('01310100', 'cep'), '01310-100');
  assert.equal(format('15102026', 'date'), '15/10/2026');
  assert.equal(format('4111111111111111', 'card'), '4111 1111 1111 1111');
});

test('CNPJ numérico e alfanumérico (2026)', () => {
  assert.equal(format('11222333000181', 'cnpj'), '11.222.333/0001-81');
  assert.equal(format('12abc34501de35', 'cnpj'), '12.ABC.345/01DE-35');
  assert.equal(format('12ABC34501DEXY', 'cnpj'), '12.ABC.345/01DE', 'DVs são só dígitos');
});

test('CPF ou CNPJ no mesmo campo', () => {
  assert.equal(format('52998224725', 'cpfCnpj'), '529.982.247-25');
  assert.equal(format('112223330001', 'cpfCnpj'), '11.222.333/0001');
  assert.equal(format('12ABC', 'cpfCnpj'), '12.ABC', 'letra indica CNPJ alfanumérico');
});

test('telefone fixo e celular', () => {
  assert.equal(format('1134567890', 'phone'), '(11) 3456-7890');
  assert.equal(format('11987654321', 'phone'), '(11) 98765-4321');
  assert.equal(format('119', 'phone'), '(11) 9');
});

test('placa Mercosul e antiga', () => {
  assert.equal(format('abc1d23', 'plate'), 'ABC1D23');
  assert.equal(format('abc1234', 'plate'), 'ABC-1234');
});

test('dinheiro da direita para a esquerda', () => {
  assert.equal(format('1', 'money'), 'R$ 0,01');
  assert.equal(format('123456', 'money'), 'R$ 1.234,56');
  assert.equal(format('R$ 1.234,567', 'money'), 'R$ 12.345,67');
  assert.equal(format('000', 'money'), '');
  assert.equal(unmask('R$ 1.234,56', 'money'), 1234.56);
  assert.equal(unmask('', 'money'), null);
});

test('unmask devolve só o valor', () => {
  assert.equal(unmask('529.982.247-25', 'cpf'), '52998224725');
  assert.equal(unmask('12.abc.345/01de-35', 'cnpj'), '12ABC34501DE35');
});

test('cursor: digitar no fim acompanha os literais', () => {
  // usuário digitou o 4º dígito: "1234" com cursor no fim
  assert.deepEqual(applyMask('1234', 4, 'cpf'), { value: '123.4', caret: 5 });
});

test('cursor: editar no meio NÃO pula para o fim', () => {
  // "529.982.247-25" → usuário apaga o "9" (posição 2) → "52.982.247-25" com cursor em 2
  const r = applyMask('52.982.247-25', 2, 'cpf');
  assert.equal(r.value, '529.822.472-5');
  assert.equal(r.caret, 2);
  // e digita "1" no meio: "5219.822.472-5", cursor em 3
  const r2 = applyMask('5219.822.472-5', 3, 'cpf');
  assert.equal(r2.value, '521.982.247-25');
  assert.equal(r2.caret, 3);
});

test('backspace logo depois de literal apaga o dígito anterior', () => {
  // "123.456" com cursor depois do ponto (posição 4): apaga o "3"
  assert.deepEqual(deleteBackward('123.456', 4, 'cpf'), { value: '124.56', caret: 2 });
  // telefone "(11) 9" com cursor depois do espaço
  assert.deepEqual(deleteBackward('(11) 9', 5, 'phone'), { value: '(19', caret: 2 });
});

test('máscara desconhecida', () => {
  assert.throws(() => format('1', 'rg'), TypeError);
});
