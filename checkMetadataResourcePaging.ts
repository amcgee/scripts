
const args = [...Deno.args]

const jsonFlag = args.indexOf('--json')
if (jsonFlag !== -1) {
  args.splice(jsonFlag, 1)
}

if (args.length < 2) {
  console.error(`USAGE: deno run --allow-net getMetadataResources.ts [--json] [baseUrl] <username> <password>`)
  Deno.exit(1)
}

const baseUrl = args.length > 2 ? args.shift() : "https://play.dhis2.org/dev"
const username = args.shift()
const password = args.shift()

type Resource = {
    displayName: string
    singular: string,
    plural: string,
    href: string
}

const headers = new Headers();
headers.set('Authorization', 'Basic ' + btoa(`${username}:${password}`))
headers.set('Accept', 'application/json')

const resourcesUrl = baseUrl + '/api/resources'
jsonFlag === -1 && console.log('Fetching...', resourcesUrl)
const resources: { resources: Array<Resource> } = await (await fetch(resourcesUrl, {
    headers
})).json();

const paged: [Resource, any][] = []
const unpaged:[Resource, any][] = []
const failed: [Resource, Error][] = []
jsonFlag === -1 && console.log(`Found ${resources.resources.length} resources!\n`)
await Promise.all(resources.resources.map(async resource => {
  try {
    const r = await (await fetch(resource.href + '?paging=true&pageSize=10', { headers })).json()
    if (!r.pager || r.pager.pageSize !== 10) {
      unpaged.push([resource, r])
    } else {
      paged.push([resource, r])
    }
  } catch (e) {
    failed.push([resource, e])
  }
}))

if (jsonFlag !== -1) {
  console.log(JSON.stringify({ 
    unpaged: unpaged.map(([resource]) => resource),
    failed: failed.map(([resource]) => resource),
    paged: paged.map(([resource]) => resource),
  }, undefined, 2))
  Deno.exit(0)
}

console.log(`Found ${paged.length} resources WITH paging`)
paged.forEach(([resource, r]) => { console.log(`\t${resource.plural}\t${resource.href}`)})
console.log(`\nFound ${unpaged.length} resources without paging`)
unpaged.forEach(([resource, r]) => { console.log(`\t${resource.plural}\t${resource.href}`)})
console.log(`\nFound ${failed.length} resources with invalid responses`)
failed.forEach(([resource, err]) => { console.log(`\t${resource.plural}\t${resource.href}`)})

export {}