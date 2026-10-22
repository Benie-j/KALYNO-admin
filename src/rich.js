import katex from 'katex'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, breaks: true, linkify: true })

function math(tex, display) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' })
  } catch (e) {
    return '<span class="math-error">' + md.utils.escapeHtml(tex) + '</span>'
  }
}

export function renderRich(source, inline = false) {
  const parts = []
  const keep = (html) => {
    parts.push(html)
    return '\uE000' + (parts.length - 1) + '\uE001'
  }

  let text = String(source ?? '')
  text = text.replace(/\\\$/g, () => keep('$'))
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(math(t.trim(), true)))
  text = text.replace(/\$([^$\n]+?)\$/g, (_, t) => keep(math(t.trim(), false)))

  const html = inline ? md.renderInline(text) : md.render(text)
  return html.replace(/\uE000(\d+)\uE001/g, (_, i) => parts[Number(i)])
}
