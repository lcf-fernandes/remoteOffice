import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'

// Aparece só quando NÃO há nenhum registro em nenhum módulo (e tudo já carregou): guia de primeiros passos.
export default function WelcomeCard({ onClient, onProject, onTask, onEvent }) {
  return (
    <Card title="Comece por aqui" id="d-welcome" hint="Seu escritório ainda está vazio — nada aqui é exemplo, tudo o que você criar será real.">
      <ol className="welcome">
        <li><span>Cadastre um <strong>cliente</strong></span><Button onClick={onClient}>Novo cliente</Button></li>
        <li><span>Monte um <strong>projeto</strong> a partir de um modelo (você revisa antes de criar)</span><Button onClick={onProject}>Projeto a partir de modelo</Button></li>
        <li><span>Anote a primeira <strong>tarefa</strong></span><Button onClick={onTask}>Nova tarefa</Button></li>
        <li><span>Agende um <strong>compromisso</strong></span><Button onClick={onEvent}>Novo evento</Button></li>
      </ol>
      <p className="card__hint">Depois, o dashboard passa a mostrar prazos, atrasos, retornos pendentes e o que precisa de atenção. Ajuste o tema e os atalhos em <a href="#/configuracoes">Configurações</a>.</p>
    </Card>
  )
}
