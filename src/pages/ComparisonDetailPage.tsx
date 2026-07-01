import { useParams } from 'react-router-dom'

export default function ComparisonDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">Comparison</h2>
      <p className="mt-2 text-slate-500">Comparison {id} — coming soon.</p>
    </div>
  )
}
