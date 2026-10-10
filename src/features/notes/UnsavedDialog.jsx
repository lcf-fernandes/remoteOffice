import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'

export default function UnsavedDialog({ open, onKeep, onDiscard }) {
  return (
    <Dialog open={open} title="Descartar alterações?" onClose={onKeep}
      actions={<><Button variant="ghost" onClick={onDiscard}>Descartar</Button><Button variant="primary" onClick={onKeep}>Continuar editando</Button></>}>
      <p>Você tem alterações que ainda não foram salvas. Se descartar, elas serão perdidas.</p>
    </Dialog>
  )
}
