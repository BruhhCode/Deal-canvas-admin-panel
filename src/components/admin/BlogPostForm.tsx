import { useState } from 'react'
import { FormField, errorMessage, inputClass, selectClass } from './FormField'
import { useToast } from './Toast'
import { BLOG_CATEGORIES } from '@/types/catalog'
import type { BlogPost, PageStatus } from '@/types/catalog'
import { createBlogPost, slugify, updateBlogPost } from '@/lib/data'

const STATUSES: PageStatus[] = ['DRAFT', 'PUBLISHED']

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}

export function BlogPostForm({
  post,
  onDone,
  onCancel,
}: {
  post?: BlogPost
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [category, setCategory] = useState(post?.category ?? BLOG_CATEGORIES[0])
  const [readTime, setReadTime] = useState(post?.read_time ?? '5 min')
  const [author, setAuthor] = useState(post?.author ?? 'DealsCanvas Editorial')
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [status, setStatus] = useState<PageStatus>(post?.status ?? 'DRAFT')
  const [publishedAt, setPublishedAt] = useState(
    post ? toDateInputValue(post.published_at) : toDateInputValue(new Date().toISOString()),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !slug.trim() || !excerpt.trim() || !imageUrl.trim() || !body.trim()) {
      setError('Title, slug, excerpt, image URL and body are required.')
      return
    }

    const input = {
      slug,
      title,
      excerpt,
      category,
      read_time: readTime,
      author,
      image_url: imageUrl.trim(),
      body,
      status,
      published_at: new Date(publishedAt).toISOString(),
    }

    setSaving(true)
    try {
      if (post) {
        await updateBlogPost(post.slug, input)
      } else {
        await createBlogPost(input)
      }
      toast.show(post ? 'Blog post updated' : 'Blog post created')
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save blog post.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Title">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!post) setSlug(slugify(e.target.value))
          }}
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Slug (post will be at /blog/<slug>)">
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!!post}
            required
          />
        </FormField>
        <FormField label="Status">
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as PageStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Excerpt (shown on the blog listing card)">
        <input
          className={inputClass}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Category">
          <input
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="blog-categories"
            required
          />
          <datalist id="blog-categories">
            {BLOG_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Read time">
          <input
            className={inputClass}
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="5 min"
          />
        </FormField>
        <FormField label="Published date">
          <input
            type="date"
            className={inputClass}
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            required
          />
        </FormField>
      </div>

      <FormField label="Author">
        <input
          className={inputClass}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </FormField>

      <FormField label="Cover image URL">
        <input
          className={inputClass}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          required
        />
      </FormField>

      {imageUrl.trim() ? (
        <div className="overflow-hidden rounded-sm border bg-cream">
          <img
            src={imageUrl}
            alt=""
            className="h-32 w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ) : null}

      <FormField label="Body (separate paragraphs with a blank line)">
        <textarea
          className={`${inputClass} min-h-56 resize-y`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
          {saving ? 'Saving...' : post ? 'Save changes' : 'Add post'}
        </button>
      </div>
    </form>
  )
}
