#!/usr/bin/env node
// 위키 결정적 점검 (의존성 없음). 실패하면 exit 1. 규칙은 AGENTS.md "페이지 형식"·"점검".
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const rel = (path) => relative(root, path).replaceAll("\\", "/")
const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const entry = resolve(dir, name)
    return statSync(entry).isDirectory() ? walk(entry) : [entry]
  })

const errors = []
const warnings = []
const fail = (path, message) => errors.push(`${rel(path)}: ${message}`)

const wikiPages = walk(resolve(root, "wiki")).filter((p) => p.endsWith(".md"))
const rawPages = walk(resolve(root, "raw")).filter((p) =>
  p.endsWith(".md")
)
const indexPath = resolve(root, "wiki/index.md")
const index = read(indexPath)
const decisions = read(resolve(root, "wiki/decisions.md"))
const questionsPath = resolve(root, "wiki/open-questions.md")
const questions = read(questionsPath)

const anchorsOf = (text) =>
  new Set([...text.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]))
const questionIds = anchorsOf(questions)
const decisionIds = anchorsOf(decisions)
const specIds = new Set(
  rawPages
    .map((p) => rel(p).match(/^raw\/figma\/(SPEC-\d+)-/)?.[1])
    .filter(Boolean)
)

// 쪽 종류별 길이 상한. 등록부(결정·질문·로그·용어집)는 추가만 하는 파일이라 넉넉히 둔다.
const REGISTERS = new Set([
  "wiki/decisions.md",
  "wiki/open-questions.md",
  "wiki/log.md",
  "wiki/glossary.md",
])
const maxLines = (path) =>
  rel(path) === "wiki/index.md" ? 150 : REGISTERS.has(rel(path)) ? 600 : 100

const STATUSES = new Set(["current", "draft", "superseded"])
const OWNERS = new Set(["product", "design", "fe", "be", "ops"])

function frontmatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1]
  if (!block) return null
  return Object.fromEntries(
    block
      .split("\n")
      .map((line) => line.match(/^(\w+):\s*(.*?)\s*(?:#.*)?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  )
}

function checkLinks(path, text) {
  for (const match of text.matchAll(/(?<!\\)\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = match[1]
    if (/^(https?:|mailto:)/.test(href)) continue
    const [file, anchor] = href.split("#")
    const target = file ? resolve(dirname(path), file) : path
    if (!existsSync(target)) {
      fail(path, `없는 링크 ${href}`)
      continue
    }
    if (anchor && statSync(target).isFile() && !anchorsOf(read(target)).has(anchor))
      fail(path, `없는 앵커 ${href}`)
  }
}

function checkIdRefs(path, text) {
  for (const [, id] of text.matchAll(/\bQ(\d{2})\b/g))
    if (!questionIds.has(`q${id}`)) fail(path, `없는 질문 Q${id}`)
  for (const [, id] of text.matchAll(/\bD-(\d{3})\b/g))
    if (!decisionIds.has(`d-${id}`)) fail(path, `없는 결정 D-${id}`)
  for (const [id] of text.matchAll(/\bSPEC-\d+\b/g))
    if (!specIds.has(id)) fail(path, `없는 원문 ${id}`)
}

const retiredPath = resolve(root, "wiki/retired-terms.txt")
const retired = existsSync(retiredPath)
  ? read(retiredPath)
      .split("\n")
      .map((line) => line.split("#")[0].trim())
      .filter(Boolean)
  : []
const today = Date.now()

for (const path of wikiPages) {
  const text = read(path)
  const meta = frontmatter(text)
  if (!meta) fail(path, "머리말 없음")
  else {
    if (!STATUSES.has(meta.status)) fail(path, `status 값 오류: ${meta.status}`)
    if (!OWNERS.has(meta.owner)) fail(path, `owner 값 오류: ${meta.owner}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.verified ?? ""))
      fail(path, "verified 날짜 없음 (YYYY-MM-DD)")
    else if (
      rel(path).startsWith("wiki/contract/") &&
      today - Date.parse(meta.verified) > 90 * 86_400_000
    )
      warnings.push(`${rel(path)}: verified가 90일을 넘음 — 다시 확인 필요`)
  }
  const lines = text.split("\n").length
  if (lines > maxLines(path))
    fail(path, `${lines}줄 — 상한 ${maxLines(path)}줄 초과`)
  if (path !== indexPath && !index.includes(rel(path).replace(/^wiki\//, "")))
    fail(path, "index.md에 등록되지 않음")
  if (meta?.status === "current" && !REGISTERS.has(rel(path)))
    for (const term of retired)
      if (text.includes(term)) fail(path, `폐기 용어 "${term}"`)
  checkLinks(path, text)
  checkIdRefs(path, text)
}

for (const path of rawPages) {
  const text = read(path)
  checkLinks(path, text)
  checkIdRefs(path, text)
  const spec = rel(path).match(/^raw\/figma\/(SPEC-\d+)-/)?.[1]
  if (spec && !index.includes(spec)) fail(path, `index.md에 ${spec} 없음`)
}

// 질문의 "영향 문서"로 걸린 쪽은 그 질문을 역으로 참조해야 한다 (화면에서 시작해도 질문이 보이게)
for (const section of questions.split(/(?=<a id="q\d+"><\/a>)/)) {
  const id = section.match(/<a id="q(\d+)"><\/a>/)?.[1]
  const affected = section.match(/^- 영향 문서: (.*)$/m)?.[1]
  if (!id || !affected) continue
  for (const [, href] of affected.matchAll(/\]\(([^)#\s]+)/g)) {
    const target = resolve(dirname(questionsPath), href)
    if (existsSync(target) && !new RegExp(`\\bQ${id}\\b`).test(read(target)))
      fail(target, `Q${id}의 영향 문서인데 Q${id} 역참조 없음`)
  }
}

for (const warning of warnings) console.warn(`경고 ${warning}`)
if (errors.length > 0) {
  for (const error of errors) console.error(`오류 ${error}`)
  console.error(`\n${errors.length}건 실패`)
  process.exit(1)
}
console.log(
  `통과: wiki ${wikiPages.length}쪽, raw ${rawPages.length}쪽, 경고 ${warnings.length}건`
)
