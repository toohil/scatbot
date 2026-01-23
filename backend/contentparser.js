import dotenv from 'dotenv'

dotenv.config();

// Tiny helper so missing env vars fail loudly (instead of vague errors)
function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
  return v;
}

const nhs_api_key = mustGetEnv("NHS_API_KEY")
console.log(nhs_api_key)


// TODO:
// 1. search & pull top (3?) pages from sources
// 2. parse pages for content - likely per source depending on layout etc.
// 3. run vectorpipeline

async function getMedlineData(keyword) {
  const url = 'https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term='+keyword;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error(error.message);
  }

  // parse for <document rank=0 (1,2,..?) > and retrieve url=example.com
  // 
}

async function getNHSData(keyword) {
  // handling for NHS API - this will need an API key - env variable? Will eventually be handled in admin API.
  
}

async function getLabTestsData(keyword) {
  // handling for labtestsonline. Plan here is to scrape file.
  const index_url = 'https://labtestsonline.org.uk/tests-index'
  const search_url = 'https://labtestsonline.org.uk/search?keywords='+keyword

}

function readFile(filename) {
  let file = fs.readFileSync(filename)
  const instruct_arr = file.toString().split('\r\n')
  const instruct_clean = []

  for (var i = 0; i < instruct_arr.length; i++) {
    const instruction = instruct_arr.at(i)
    if (instruction != '') {
      instruct_clean.push(instruction)
    }
  }

  return instruct_clean
}

console.log(readFile('study_docs/SDJC01-PIL01 Stool Sample.docx.txt'))

// import fs from 'fs';

// DEMO CODE - INSERTING EMBEDDINGS INTO DB.
// const text = fs.readFileSync('study_docs/SDJC01-PIL01 Stool Sample.docx.txt','utf-8')
// const instructions = text.split('\r\n')
// for (const i of instructions) {
//   const instruction = i.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
//   const instruction_clean = instruction.trim()
//   if (instruction != "") {
//     await vector_pipe.addToIndex(instruction_clean)
//   }
// }
