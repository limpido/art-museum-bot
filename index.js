const fetch = require('node-fetch');
const { http, https } = require('follow-redirects');
const M = require('./mastodon');
require('dotenv').config()

const API_URL = `https://api.harvardartmuseums.org/object?apikey=${process.env.API_KEY}&hasimage=1`;
const arr = ["title", "classification", "primaryimageurl", "dated", "people", "division", "url"];

async function toot(item, stream) {
  let status = `${item.title} (${item.dated})`;

  let len = item.author.length;
  for (let i = 0; i < len; i++) {
    if (i > 0)
      status += `, ${item.author[i]}`;
    else status += `\nArtist: ${item.author[i]}`;
  }
  status += `\nSource: ${item.url}`;

  M.post('media', { file: stream }).then(res => {
    const id = res.data.id;
    M.post('statuses', { status, media_ids: [id] })
  });
}

async function main() {
  let res = await fetch(API_URL);
  let data = await res.json();
  const pages = data.info.pages;
  const page = random(pages) + 1;
  let record = await getRecord(page);

  let item = {};
  for (let el of arr) {
    item[el] = record[el];
  }
  item.author = [];
  if (item.people) {
    for (let person of item.people) {
      item.author.push(person.name);
    }
    delete item.people;
  }
  console.log(item);

  https.get(item.primaryimageurl, async (stream) => {
    toot(item, stream);
  });
}

async function getRecord(page) {
  let record;
  do {
    let data = await (await fetch(`${API_URL}&page=${page}`)).json();
    let records = data.records;
    let index = random(records.length);
    record = records[index];
  } while (!record.primaryimageurl);
  return record;
}

function random(range) {
  return Math.floor(Math.random() * range);
}

main();