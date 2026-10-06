# input-masks-br

[![CI](https://github.com/Ph20sr/input-masks-br/actions/workflows/ci.yml/badge.svg)](https://github.com/Ph20sr/input-masks-br/actions/workflows/ci.yml)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

Máscaras de formulário para dados brasileiros que **não brigam com quem está digitando**. Não tem dependências e funciona em qualquer `<input>`.

| máscara | exemplo |
| --- | --- |
| `cpf` | `529.982.247-25` |
| `cnpj` | `11.222.333/0001-81` e **alfanumérico**: `12.ABC.345/01DE-35` |
| `cpfCnpj` | troca sozinha conforme o tamanho (ou se aparecer letra) |
| `phone` | `(11) 3456-7890` / `(11) 98765-4321` |
| `cep` | `01310-100` |
| `date` | `15/10/2026` |
| `card` | `4111 1111 1111 1111` |
| `plate` | `ABC1D23` (Mercosul) / `ABC-1234` |
| `money` | `R$ 1.499,90`, digitando da direita para a esquerda como em app de banco |

## O que ela faz diferente

- **Editar no meio não joga o cursor para o fim.** Ela conta os caracteres "de verdade" antes do cursor e recoloca o cursor no mesmo ponto lógico depois de formatar.
- **Backspace logo depois de `.` `-` `/` não trava.** A máscara recolocaria o literal apagado e o campo pareceria não responder. Aqui, apaga o dígito anterior.
- **Teclado certo no celular**: `inputmode` numérico, telefone ou texto, conforme a máscara.
- **Valor limpo pronto para enviar** em `input.dataset.raw` (`52998224725`, `1499.9`).
- Testado com digitação real no navegador, além dos testes unitários da lógica.

## Uso

```html
<input data-mask="cpf">
<input data-mask="phone">
<input data-mask="money" name="valor">

<script type="module">
  import { autoBind } from 'https://cdn.jsdelivr.net/gh/Ph20sr/input-masks-br/src/input-masks-br.js';
  autoBind();
</script>
```

Ou um campo específico:

```js
import { bindMask, unmask } from 'input-masks-br';

const unbind = bindMask(document.querySelector('#documento'), 'cpfCnpj');

form.addEventListener('submit', () => {
  const doc = unmask(form.documento.value, 'cpfCnpj');   // '52998224725'
  const valor = unmask(form.valor.value, 'money');       // 1499.9
});
```

### Só a formatação (Node, React, back-end)

```js
import { format, applyMask } from 'input-masks-br/core';

format('12abc34501de35', 'cnpj');          // '12.ABC.345/01DE-35'
applyMask('52.982.247-25', 2, 'cpf');      // { value: '529.822.472-5', caret: 2 }
```

Em React, chame `applyMask` no `onChange` e aplique o `caret` com `setSelectionRange`.

> A máscara formata e não valida. Para validar os dígitos verificadores, use [`brasil-utils`](https://github.com/Ph20sr/brasil-utils).

## Desenvolvimento

```bash
npm test       # formatação, cursor e backspace (node:test)
npm run demo   # http://localhost:5173
```

## Licença

MIT
