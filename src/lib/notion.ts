const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_VERSION = '2022-06-28'

// Usuarios Registrados DB — inside WorkPilot page in MrLabs ERP v1
const USUARIOS_DB_ID = '1684fb7c999e45559ccec54115ba7a42'

export async function addNotionUser({
  id,
  name,
  email,
  plan,
}: {
  id: string
  name: string | null
  email: string
  plan?: string | null
}) {
  if (!NOTION_TOKEN) {
    console.error('[Notion] NOTION_TOKEN not set')
    return
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: USUARIOS_DB_ID },
      properties: {
        Nombre: { title: [{ text: { content: name || email } }] },
        Email: { email },
        Plan: plan ? { select: { name: plan } } : undefined,
        'Fecha Registro': { date: { start: new Date().toISOString().split('T')[0] } },
        'Clerk ID': { rich_text: [{ text: { content: id } }] },
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[Notion] Error:', JSON.stringify(data))
  } else {
    console.log('[Notion] Usuario registrado:', email)
  }
}
