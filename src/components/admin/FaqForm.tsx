import { useState } from 'react'
import { FormField, errorMessage, inputClass } from './FormField'
import type { Faq } from '@/types/catalog'
import { createFaq, updateFaq } from '@/lib/data'

export function FaqForm({
  faq,
  sections,
  onDone,
  onCancel,
}: {
  faq?: Faq
  sections: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const [section, setSection] = useState(faq?.section ?? sections[0] ?? '')
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [sortOrder, setSortOrder] = useState(faq?.sort_order ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!section.trim() || !question.trim() || !answer.trim()) {
      setError('Section, question and answer are required.')
      return
    }

    const input = { section, question, answer, sort_order: sortOrder }

    setSaving(true)
    try {
      if (faq) {
        await updateFaq(faq.id, input)
      } else {
        await createFaq(input)
      }
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save FAQ.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section (groups FAQs on the public page)">
          <input
            className={inputClass}
            value={section}
            onChange={(e) => setSection(e.target.value)}
            list="faq-sections"
            required
          />
          <datalist id="faq-sections">
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Order within section (lower shows first)">
          <input
            type="number"
            className={inputClass}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </FormField>
      </div>

      <FormField label="Question">
        <input
          className={inputClass}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Answer">
        <textarea
          className={`${inputClass} min-h-32 resize-y`}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
        />
      </FormField>

      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Saving...' : faq ? 'Save changes' : 'Add FAQ'}
        </button>
      </div>
    </form>
  )
}
