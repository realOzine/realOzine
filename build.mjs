// 生成 GitHub 主页上的两张卡片：light.svg 和 dark.svg。
// 改内容或颜色只改下面的 content / theme，然后运行 `node build.mjs`。
// 视觉语言照搬博客 ozine.me：一种等宽字，18px 字号下一个字符 9px、一行 30px，
// 层次只靠颜色（h1 绿、h2 紫/黄、技能名青、链接蓝、列表符号紫），没有圆角、阴影和装饰。
import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const content = [
  { h1: 'ozine' },
  { p: 'Senior backend engineer. I have spent years writing Go services that stay up, and I care just as much about why they stay up: consensus, replication, scheduling, and the Linux kernel underneath it all.' },
  { h2: 'Skills' },
  { list: [
    ['go', 'backend services, concurrency, profiling and performance tuning'],
    ['rust', 'what I reach for when I want the compiler on my side'],
    ['python', 'scripts, tooling and the glue between systems'],
    ['linux', 'where everything runs; I read strace before I guess'],
    ['docker / k8s', 'images, deployments, and keeping clusters boring'],
  ] },
  { h2: 'Interests' },
  { list: [
    ['', 'distributed systems: Raft, Paxos, consistency models, failure modes'],
    ['', 'how things actually work, from the syscall up'],
  ] },
  { h2: 'Blog' },
  { p: 'Notes on what I have learned and the pitfalls I have hit:', link: 'https://ozine.me' },
]

// 色值与博客 src/styles/global.css 的 token 一致，对比度在博客 docs/design.md 里算过
const theme = {
  light: { page: '#fdf7f5', body: '#2e2c2d', green: '#5c9e56', h2: '#563cb1', cyan: '#1a7575', blue: '#3973a3', purple: '#563cb1' },
  dark: { page: '#292d3e', body: '#d8e0ec', green: '#62de84dd', h2: '#ffcb6bdd', cyan: '#60baec', blue: '#75a1ff', purple: '#f580ffdd' },
}

const CW = 9 // 一个字符宽
const LINE = 30 // 一行高
const WIDTH = 800
const PAD_X = CW * 2
const LIST_X = PAD_X + CW + CW * 3 // 列表：左外边距一格 + 左内边距三格
const font = readFileSync(new URL('fonts/inconsolata-latin-wght-normal.woff2', import.meta.url)).toString('base64')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 按字符数折行；内容只有 ASCII，等宽字下一个字符就是一格
function wrap(text, cols) {
  const lines = ['']
  for (const word of text.split(' ')) {
    assert(word.length <= cols, `单词太长，放不进一行：${word}`)
    const last = lines.length - 1
    const next = lines[last] ? `${lines[last]} ${word}` : word
    if (next.length <= cols) lines[last] = next
    else lines.push(word)
  }
  return lines
}

function render(c) {
  const out = []
  let y = LINE / 2 // 上内边距半行
  let gap = 0 // 上一个块留下的下外边距，和下一个块的上外边距折叠
  const text = (x, top, h, size, fill, s, bold = false) =>
    out.push(`<text x="${x}" y="${top + h / 2}" font-size="${size}" fill="${fill}"${bold ? ' font-weight="700"' : ''}>${esc(s)}</text>`)

  for (const block of content) {
    if (block.h1 || block.h2) {
      y += block.h2 ? Math.max(gap, LINE) : 0
      text(PAD_X, y, LINE * 2, block.h1 ? 32 : 28.57, block.h1 ? c.green : c.h2, block.h1 || block.h2, true)
      y += LINE * 2
      gap = 0 // 标题贴着下文
    } else if (block.p) {
      y += gap
      for (const line of wrap(block.p, (WIDTH - PAD_X * 2) / CW)) {
        text(PAD_X, y, LINE, 18, c.body, line)
        y += LINE
      }
      if (block.link) { // 段落的最后一行；SVG 里的下划线不可靠，画一条 1px 的线
        text(PAD_X, y, LINE, 18, c.blue, block.link)
        out.push(`<rect x="${PAD_X}" y="${y + 22}" width="${block.link.length * CW}" height="1" fill="${c.blue}"/>`)
        y += LINE
      }
      gap = LINE
    } else if (block.list) {
      y += gap
      const labelCols = Math.max(...block.list.map(([k]) => k.length))
      const indent = labelCols ? labelCols + 2 : 0 // 名字列对齐，后面空两格
      for (const [label, desc] of block.list) {
        text(LIST_X - CW * 3, y, LINE, 18, c.purple, '>', true)
        if (label) text(LIST_X, y, LINE, 18, c.cyan, label)
        for (const line of wrap(desc, (WIDTH - PAD_X - CW - LIST_X) / CW - indent)) {
          text(LIST_X + indent * CW, y, LINE, 18, c.body, line)
          y += LINE
        }
      }
      gap = LINE
    }
  }
  const height = y + gap + LINE / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
<style>
@font-face { font-family: Inconsolata; font-weight: 200 900; src: url(data:font/woff2;base64,${font}) format("woff2"); }
text { font-family: Inconsolata, ui-monospace, Menlo, Consolas, monospace; dominant-baseline: central; white-space: pre; }
</style>
<rect width="100%" height="100%" fill="${c.page}"/>
${out.join('\n')}
</svg>
`
}

for (const [name, colors] of Object.entries(theme)) {
  writeFileSync(new URL(`${name}.svg`, import.meta.url), render(colors))
  console.log(`已生成 ${name}.svg`)
}
