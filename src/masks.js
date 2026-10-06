// Máscaras brasileiras + controle de cursor. Sem DOM: testável no Node.
//
// Padrões: 0 = dígito, A = letra ou dígito (maiúsculo), L = letra (maiúscula).
// Qualquer outro caractere é literal e só aparece quando o próximo token tem valor.

const TOKENS = {
  0: /\d/,
  A: /[0-9A-Z]/,
  L: /[A-Z]/,
};

const isSignificant = (ch) => /[0-9A-Za-z]/.test(ch);

export function formatPattern(raw, pattern) {
  const chars = String(raw ?? '').toUpperCase().split('').filter(isSignificant);
  let out = '';
  let pending = '';
  let ci = 0;
  for (const p of pattern) {
    if (ci >= chars.length) break;
    const token = TOKENS[p];
    if (!token) {
      pending += p;
      continue;
    }
    // Avança na entrada até achar um caractere aceito por este token
    while (ci < chars.length && !token.test(chars[ci])) ci++;
    if (ci >= chars.length) break;
    out += pending + chars[ci++];
    pending = '';
  }
  return out;
}

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Definições: format(raw) → string mascarada; unmask(valor) → valor limpo. */
export const MASKS = {
  cpf: { format: (v) => formatPattern(onlyDigits(v), '000.000.000-00'), inputmode: 'numeric' },
  // CNPJ alfanumérico (2026): 12 posições [0-9A-Z] + 2 dígitos verificadores
  cnpj: { format: (v) => formatPattern(v, 'AA.AAA.AAA/AAAA-00'), inputmode: 'text' },
  cpfCnpj: {
    format: (v) => {
      const clean = String(v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
      return clean.length <= 11 && /^\d*$/.test(clean) ? MASKS.cpf.format(clean) : MASKS.cnpj.format(clean);
    },
    inputmode: 'text',
  },
  phone: {
    format: (v) => {
      const d = onlyDigits(v).slice(0, 11);
      return formatPattern(d, d.length > 10 ? '(00) 00000-0000' : '(00) 0000-00000');
    },
    inputmode: 'tel',
  },
  cep: { format: (v) => formatPattern(onlyDigits(v), '00000-000'), inputmode: 'numeric' },
  date: { format: (v) => formatPattern(onlyDigits(v), '00/00/0000'), inputmode: 'numeric' },
  card: { format: (v) => formatPattern(onlyDigits(v), '0000 0000 0000 0000'), inputmode: 'numeric' },
  // Placa Mercosul (ABC1D23) e antiga (ABC-1234)
  plate: {
    format: (v) => {
      const c = String(v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 7);
      return /^[A-Z]{3}\d[A-Z]/.test(c) ? formatPattern(c, 'LLL0L00') : formatPattern(c, 'LLL-0000');
    },
    inputmode: 'text',
  },
  // Dinheiro "da direita para a esquerda", como em app de banco: 1 → 0,01 → 0,12 → 1,23
  money: {
    format: (v) => {
      const d = onlyDigits(v).replace(/^0+/, '').slice(0, 13);
      if (!d) return '';
      return `R$ ${brl.format(Number(d) / 100)}`;
    },
    inputmode: 'numeric',
    caretAtEnd: true,
  },
};

export function onlyDigits(v) {
  return String(v ?? '').replace(/\D/g, '');
}

/** Valor limpo para enviar ao servidor (dinheiro vira número). */
export function unmask(value, type) {
  if (type === 'money') {
    const d = onlyDigits(value);
    return d ? Number(d) / 100 : null;
  }
  return String(value ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function format(value, type) {
  const mask = MASKS[type];
  if (!mask) throw new TypeError(`Máscara desconhecida: ${type}`);
  return mask.format(value);
}

/** Posição no texto logo após o n-ésimo caractere significativo. */
function caretAfterSignificant(text, n) {
  if (n <= 0) {
    const first = [...text].findIndex(isSignificant);
    return first === -1 ? text.length : Math.min(first, text.length);
  }
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (isSignificant(text[i]) && ++seen === n) return i + 1;
  }
  return text.length;
}

/**
 * Aplica a máscara preservando a posição lógica do cursor: conta quantos
 * caracteres significativos havia antes do cursor e devolve o cursor depois
 * do mesmo número de caracteres no texto formatado.
 */
export function applyMask(value, caret, type) {
  const mask = MASKS[type];
  if (!mask) throw new TypeError(`Máscara desconhecida: ${type}`);
  const formatted = mask.format(value);
  if (mask.caretAtEnd) return { value: formatted, caret: formatted.length };
  const before = [...String(value).slice(0, caret)].filter(isSignificant).length;
  return { value: formatted, caret: caretAfterSignificant(formatted, before) };
}

/**
 * Backspace logo depois de um literal ("." "-" "/" ")"): em vez de apagar
 * o literal (que a máscara recolocaria, travando o campo), apaga o
 * caractere significativo anterior a ele.
 */
export function deleteBackward(value, caret, type) {
  let i = caret;
  while (i > 0 && !isSignificant(value[i - 1])) i--;
  if (i === 0) return applyMask(value, caret, type);
  const next = value.slice(0, i - 1) + value.slice(caret);
  return applyMask(next, i - 1, type);
}
