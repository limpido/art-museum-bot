const fetch = require('node-fetch');
const { http, https } = require('follow-redirects');
const M = require('./mastodon');
require('dotenv').config()

const API_URL = `https://api.harvardartmuseums.org/object?apikey=${process.env.API_KEY}&hasimage=1`;
const arr = ["title", "classification", "images", "dated", "people", "division", "url", "primaryimageurl"];

function toot(item, media_ids) {
  M.post('statuses', { status: getTootStatus(item), media_ids })
}

function getTootStatus(item) {
  let status = `${item.title}`;
  if (item.dated)
    status += ` (${item.dated})`

  let len = item.persons.length;
  for (let i = 0; i < len; i++) {
    if (i > 0)
      status += `, ${item.persons[i]}`;
    else status += `\nPeople: ${item.persons[i]}`;
  }
  status += `\nSource: ${item.url}`;

  return status;
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

  item.persons = [];
  if (item.people) {
    for (let person of item.people) {
      item.persons.push(person.name);
    }
    delete item.people;
  }

  item.imageUrls = [];
  if (item.images.length) {
    for (let image of item.images) {
      item.imageUrls.push(image.baseimageurl);
    }
  } else {
    item.imageUrls.push(item.primaryimageurl)
  }
  delete item.images;
  console.log(item);

  let media_ids = [];
  for (let url of item.imageUrls) {
    id = await getImg(url, media_ids);
    media_ids.push(id);
  }
  toot(item, media_ids);
}

async function getImg(url) {
  return new Promise((resolve) => {
    https.get(url, async (stream) => {
      let id = await uploadImg(stream);
      resolve(id);
    });
  })
}

async function uploadImg(stream) {
  return M.post('media', { file: stream }).then(res => {
    return res.data.id;
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