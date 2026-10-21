// Após enviar um formulário com erros, leva o foco ao primeiro campo inválido (teclado e leitor de tela percebem o problema).
// Espera o React desenhar os erros (aria-invalid) antes de procurar o campo.
export function focusFirstInvalid(form) {
  if (!form || typeof form.querySelector !== 'function') return
  const run = () => form.querySelector('[aria-invalid="true"]')?.focus()
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
  else setTimeout(run, 0)
}
