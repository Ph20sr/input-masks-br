import { MASKS, applyMask, deleteBackward, unmask } from './masks.js';

export { MASKS, applyMask, deleteBackward, unmask, format, formatPattern } from './masks.js';

/**
 * Liga uma máscara a um <input>. Devolve uma função para desligar.
 *
 *     bindMask(document.querySelector('#cpf'), 'cpf');
 */
export function bindMask(input, type) {
  const mask = MASKS[type];
  if (!mask) throw new TypeError(`Máscara desconhecida: ${type}`);
  if (!input.hasAttribute('inputmode')) input.setAttribute('inputmode', mask.inputmode);
  input.setAttribute('autocomplete', input.getAttribute('autocomplete') ?? 'off');

  const commit = ({ value, caret }) => {
    input.value = value;
    if (document.activeElement === input) input.setSelectionRange(caret, caret);
    input.dataset.raw = String(unmask(value, type) ?? '');
  };

  const onBeforeInput = (e) => {
    // Backspace sem seleção logo após um literal: trata aqui para não "travar"
    if (e.inputType === 'deleteContentBackward' && input.selectionStart === input.selectionEnd && !mask.caretAtEnd) {
      const caret = input.selectionStart ?? 0;
      if (caret > 0 && !/[0-9A-Za-z]/.test(input.value[caret - 1])) {
        e.preventDefault();
        commit(deleteBackward(input.value, caret, type));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  const onInput = () => {
    const caret = input.selectionStart ?? input.value.length;
    const next = applyMask(input.value, caret, type);
    if (next.value !== input.value || mask.caretAtEnd) commit(next);
    else input.dataset.raw = String(unmask(next.value, type) ?? '');
  };

  input.addEventListener('beforeinput', onBeforeInput);
  input.addEventListener('input', onInput);
  if (input.value) commit(applyMask(input.value, input.value.length, type));

  return () => {
    input.removeEventListener('beforeinput', onBeforeInput);
    input.removeEventListener('input', onInput);
  };
}

/** Liga todos os inputs com data-mask="cpf|cnpj|cpfCnpj|phone|cep|date|card|plate|money". */
export function autoBind(root = document) {
  return [...root.querySelectorAll('input[data-mask]')].map((el) => bindMask(el, el.dataset.mask));
}
