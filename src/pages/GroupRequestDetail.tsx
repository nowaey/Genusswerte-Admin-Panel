import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useGroupRequestDetail } from '@/hooks/useGroupRequests'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import type { GroupRequestStatus } from '@/types/database'

export default function GroupRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const { request, loading, reload } = useGroupRequestDetail(id)
  const [saving, setSaving]       = useState(false)
  const [adminNotes, setAdminNotes] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)

  if (loading) return <p className="text-sm text-muted-foreground p-6">Laden...</p>
  if (!request) return <p className="text-sm text-destructive p-6">Gruppenanfrage nicht gefunden.</p>

  async function setStatus(status: GroupRequestStatus) {
    setSaving(true)
    await supabase.from('group_requests').update({ status }).eq('id', request!.id)
    setSaving(false)
    reload()
  }

  async function saveNotes() {
    setSavingNotes(true)
    await supabase.from('group_requests').update({ admin_notes: adminNotes ?? request!.admin_notes }).eq('id', request!.id)
    setSavingNotes(false)
    setAdminNotes(null)
    reload()
  }

  function buildEmailTemplate() {
    return {
      subject: `Ihre Gruppenanfrage: ${request!.tasting_name} – Genusswerte Bonn`,
      body: `Hallo ${request!.customer_name},\n\nvielen Dank für Ihre Anfrage für das ${request!.tasting_name} (${request!.persons} Personen).\n\n[Angebot / Terminvorschlag hier einfügen]\n\nBei Fragen melden Sie sich gerne.\n\nHerzliche Grüße\nIhr Genusswerte-Team`,
    }
  }

  const email = buildEmailTemplate()
  const currentNotes = adminNotes !== null ? adminNotes : (request.admin_notes ?? '')

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`Gruppenanfrage: ${request.tasting_name}`}
        subtitle={`${request.customer_name} · ${request.persons} Personen`}
        back
      />

      {/* Status + Aktionen */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={request.status} />
          <span className="text-xs text-muted-foreground">
            Eingegangen: {new Date(request.created_at).toLocaleDateString('de-DE')}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {request.status === 'new' && (
            <ActionBtn onClick={() => setStatus('reviewing')} disabled={saving}>In Prüfung nehmen</ActionBtn>
          )}
          {request.status === 'reviewing' && (
            <ActionBtn onClick={() => setStatus('offer_sent')} disabled={saving}>Angebot gesendet</ActionBtn>
          )}
          {request.status === 'offer_sent' && (
            <ActionBtn onClick={() => setStatus('confirmed')} disabled={saving}>Bestätigen</ActionBtn>
          )}
          {request.status === 'confirmed' && (
            <ActionBtn onClick={() => setStatus('completed')} disabled={saving}>Abschließen</ActionBtn>
          )}
          {!['completed', 'rejected'].includes(request.status) && (
            <ActionBtn onClick={() => setStatus('rejected')} variant="danger" disabled={saving}>Ablehnen</ActionBtn>
          )}
        </div>
      </div>

      {/* Anfrage-Daten */}
      <div className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-sm font-medium">Anfrage-Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <InfoRow label="Name">{request.customer_name}</InfoRow>
          <InfoRow label="Personen">{request.persons}</InfoRow>
          <InfoRow label="E-Mail">
            <a href={`mailto:${request.customer_email}`} className="text-primary hover:underline">
              {request.customer_email}
            </a>
          </InfoRow>
          {request.customer_phone && (
            <InfoRow label="Telefon">{request.customer_phone}</InfoRow>
          )}
          {request.desired_period && (
            <InfoRow label="Wunschzeitraum">{request.desired_period}</InfoRow>
          )}
          {request.occasion && (
            <InfoRow label="Anlass">{request.occasion}</InfoRow>
          )}
        </dl>

        {request.message && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Nachricht</p>
            <p className="text-sm bg-muted/40 rounded px-3 py-2">{request.message}</p>
          </div>
        )}
      </div>

      {/* E-Mail Vorlage */}
      <div className="bg-white rounded-lg border border-border p-6 space-y-3">
        <h2 className="text-sm font-medium">E-Mail-Vorlage</h2>
        <details>
          <summary className="text-sm cursor-pointer text-primary hover:underline">E-Mail-Text anzeigen</summary>
          <div className="mt-3 bg-muted/40 rounded-md p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Betreff</p>
            <p className="text-sm font-medium">{email.subject}</p>
            <p className="text-xs font-medium text-muted-foreground mt-3">Text (kopieren & anpassen)</p>
            <pre className="text-sm whitespace-pre-wrap font-sans">{email.body}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(email.body)}
              className="mt-2 px-3 py-1.5 border border-border rounded-md text-xs hover:bg-muted transition-colors"
            >
              Text kopieren
            </button>
          </div>
        </details>
      </div>

      {/* Admin-Notizen */}
      <div className="bg-white rounded-lg border border-border p-6 space-y-3">
        <h2 className="text-sm font-medium">Interne Notizen</h2>
        <textarea
          rows={3}
          value={currentNotes}
          onChange={e => setAdminNotes(e.target.value)}
          placeholder="Nur für Admin sichtbar..."
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {adminNotes !== null && (
          <div className="flex gap-2">
            <button onClick={saveNotes} disabled={savingNotes}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {savingNotes ? 'Speichern...' : 'Notizen speichern'}
            </button>
            <button onClick={() => setAdminNotes(null)}
              className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors">
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="font-medium text-sm">{children}</dd>
    </div>
  )
}

function ActionBtn({ onClick, children, variant = 'default', disabled }: {
  onClick: () => void; children: React.ReactNode; variant?: 'default' | 'danger'; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-sm border transition-colors disabled:opacity-50 ${
        variant === 'danger' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}
