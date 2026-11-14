import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'

export function NotFoundView({ what = 'La ruta solicitada' }: { what?: string }) {
  return (
    <div className="page">
      <PageHeader eyebrow="N0VA-7 · ERROR 404" title="Registro no encontrado">
        {what} no existe en la memoria de la nave.
      </PageHeader>
      <Link to="/" className="btn btn-primary">
        Volver al puente
      </Link>
    </div>
  )
}
