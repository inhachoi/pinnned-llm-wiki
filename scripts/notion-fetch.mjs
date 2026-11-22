#!/usr/bin/env node
// 주간 수집용: 노션 회의록 DB에서 대상 기간의 회의록을 .notion-tmp/meetings/ 에 마크다운으로 내려받는다 (읽기 전용, 의존성 없음).
//   node scripts/notion-fetch.mjs --since YYYY-MM-DD --until YYYY-MM-DD
// env: NOTION_TOKEN (없으면 아무것도 하지 않고 끝난다), NOTION_MEETING_DB_ID (선택)
// 원문은 사담·실명이 섞여 있다. .notion-tmp/ 는 gitignore이며 레포에 넣지 않는다 (AGENTS.md "수집").
import { mkdirSync, rmSync, writeFileSync } from "node:fs"

const DEFAULT_MEETING_DB_ID = "420379ef2f0d807d9788c98a6be550cc"
// 회의 뒤 며칠에 걸쳐 고쳐 쓰는 회의록까지 다시 읽되, 오래된 회의록의 일괄 수정(이관 등)은 건너뛴다.
const LOOKBACK_DAYS = 14
const OUT_DIR = ".notion-tmp/meetings"

const args = process.argv.slice(2)
const flag = (name) => args[args.indexOf(`--${name}`) + 1]
const since = flag("since")
const until = flag("until")
if (!/^\d{4}-\d{2}-\d{2}$/.test(since ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(until ?? "")) {
  console.error("사용법: notion-fetch.mjs --since YYYY-MM-DD --until YYYY-MM-DD")
  process.exit(1)
}
const token = process.env.NOTION_TOKEN
if (!token) {
  console.log("NOTION_TOKEN 없음 — 노션 수집 건너뜀")
  process.exit(0)
}
const databaseId = process.env.NOTION_MEETING_DB_ID || DEFAULT_MEETING_DB_ID

async function api(path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if ((res.status === 429 || res.status >= 500) && attempt < 8) {
      const wait = (Number(res.headers.get("retry-after")) || 1) * 1000 + 300
      await new Promise((resolve) => setTimeout(resolve, wait))
      continue
    }
    const json = await res.json()
    if (json.object === "error")
      throw new Error(`노션 ${path}: ${json.status} ${json.code}`)
    return json
  }
}

async function all(path, body) {
  const results = []
  let cursor
  do {
    const page =
      body === undefined
        ? await api(`${path}?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
        : await api(path, { ...body, page_size: 100, start_cursor: cursor })
    results.push(...page.results)
    cursor = page.has_more ? page.next_cursor : undefined
  } while (cursor)
  return results
}

const plain = (richText) => (richText ?? []).map((t) => t.plain_text).join("")
const PREFIX = {
  heading_1: "# ",
  heading_2: "## ",
  heading_3: "### ",
  bulleted_list_item: "- ",
  numbered_list_item: "1. ",
  quote: "> ",
  callout: "> ",
  toggle: "▸ ",
}

async function toMarkdown(blockId, depth = 0) {
  let out = ""
  for (const block of await all(`/blocks/${blockId}/children`)) {
    const data = block[block.type] ?? {}
    const pad = "  ".repeat(depth)
    const text = plain(data.rich_text)
    if (block.type === "child_page" || block.type === "child_database") continue
    if (block.type === "code") out += `${pad}\`\`\`\n${text}\n${pad}\`\`\`\n`
    else if (block.type === "table_row")
      out += `${pad}| ${data.cells.map(plain).join(" | ")} |\n`
    else if (block.type === "to_do")
      out += `${pad}- [${data.checked ? "x" : " "}] ${text}\n`
    else if (text || PREFIX[block.type])
      out += `${pad}${PREFIX[block.type] ?? ""}${text}\n`
    if (block.has_children) out += await toMarkdown(block.id, depth + 1)
  }
  return out
}

const shift = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10)

const rows = await all(`/databases/${databaseId}/query`, {
  filter: {
    and: [
      { timestamp: "last_edited_time", last_edited_time: { on_or_after: `${since}T00:00:00+09:00` } },
      { property: "날짜", date: { on_or_after: shift(since, -LOOKBACK_DAYS) } },
      { property: "날짜", date: { on_or_before: until } },
    ],
  },
  sorts: [{ property: "날짜", direction: "ascending" }],
})

rmSync(".notion-tmp", { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })
for (const row of rows) {
  const date = row.properties["날짜"].date.start.slice(0, 10)
  const title = plain(
    Object.values(row.properties).find((p) => p.type === "title")?.title
  )
  const kind = row.properties["선택"]?.select?.name ?? ""
  const body = await toMarkdown(row.id)
  // 같은 날짜에 회의가 여럿일 수 있어 쪽 ID 앞 8자를 붙인다
  writeFileSync(
    `${OUT_DIR}/${date}_${row.id.slice(0, 8)}.md`,
    `# ${title}\n쪽 ID: ${row.id}\n날짜: ${date}\n종류: ${kind}\n수정: ${row.last_edited_time}\n\n${body}`
  )
}
console.log(`노션 회의록 ${rows.length}건 → ${OUT_DIR}`)
