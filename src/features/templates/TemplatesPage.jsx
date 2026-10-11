import { useState } from 'react'
import { Copy, Pencil, Play, Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { ErrorState, LoadingState } from '../../components/states.jsx'
import { useTemplates } from './TemplatesProvider.jsx'
import { useTemplateEditor } from './TemplateEditor.jsx'
import { useTemplateWizard } from './TemplateWizard.jsx'
import { templateErrorMessage } from '../../services/templates.js'
import { PROJECT_TYPE_LABEL } from '../../utils/projects.js'
import { PRIORITY_LABEL } from '../../utils/tasks.js'

export default function TemplatesPage() {
  const { all, status, error, retry } = useTemplates()
  const editor = useTemplateEditor()
  const wizard = useTemplateWizard()
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">Modelos de projeto</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>Listas de tarefas reutilizáveis. Um modelo nunca cria nada sozinho: você revisa a lista e confirma.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Novo modelo</Button>
      </header>

      {status === 'loading' && <LoadingState label="Carregando seus modelos…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar seus modelos" onRetry={retry}>{templateErrorMessage(error)} Os modelos padrão continuam disponíveis.</ErrorState>}

      <ul className="plist">
        {all.map((t) => (
          <li key={t.id} className="plist__row">
            <div className="plist__main">
              <p className="row__title">{t.name} {t.builtin && <span className="badge badge--neutral">Padrão</span>}</p>
              <p className="row__meta">{PROJECT_TYPE_LABEL[t.projectType] ?? t.projectType} · {t.tasks.length} {t.tasks.length === 1 ? 'tarefa' : 'tarefas'}{t.description ? ` · ${t.description}` : ''}</p>
              <button type="button" className="linklike" aria-expanded={expanded === t.id} onClick={() => setExpanded(expanded === t.id ? null : t.id)}>{expanded === t.id ? 'Ocultar tarefas' : 'Ver tarefas'}</button>
              {expanded === t.id && (
                <ol className="tpl__preview">
                  {t.tasks.map((x, i) => <li key={i}>{x.title} <span className="row__meta">· {PRIORITY_LABEL[x.priority]}{x.offsetDays !== null && x.offsetDays !== undefined ? ` · +${x.offsetDays} dias` : ' · sem prazo'}</span></li>)}
                </ol>
              )}
            </div>
            <div className="plist__side">
              <Button variant="primary" icon={Play} onClick={() => wizard.open(t.id)}>Usar modelo</Button>
              {t.builtin ? <Button icon={Copy} onClick={() => editor.duplicate(t)}>Duplicar para editar</Button> : <Button icon={Pencil} onClick={() => editor.openEdit(t)}>Editar</Button>}
            </div>
          </li>
        ))}
      </ul>
      <p className="card__hint">Modelos padrão não podem ser alterados; duplique para criar a sua versão. “Usar modelo” abre uma revisão com a lista exata de tarefas, e só cria o projeto depois da sua confirmação.</p>
    </div>
  )
}
