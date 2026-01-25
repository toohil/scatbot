import dotenv from 'dotenv';
import fs from 'node:fs';
import { VectorPipeline } from './chatpipelines.js';

dotenv.config();

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
  return v;
}

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
}

async function getNHSData(keyword) {
  // handling for NHS API - this will need an API key - env variable? Will eventually be handled in admin API.
  const result = await fetch('https://sandbox.api.service.nhs.uk/nhs-website-content/health-a-to-z', {
    method: "GET",
    headers: {
      accept: "application/json",
      apikey: nhs_api_key
    }
    
    }
  )
  return result
}


function readFile(filename) {
  let file = fs.readFileSync(filename)
  const instruct_arr = file.toString().split('\n')
  const instruct_clean = []
  
  for (var i = 0; i < instruct_arr.length; i++) {
    const instruction = instruct_arr.at(i)
    if (instruction != '') {
      instruct_clean.push(instruction)
    }
  }

  return instruct_clean
}

const vpipe = new VectorPipeline()
await vpipe.loadModel()

const vectordb = {
  vectors: []
}

const instructions = readFile('./study_docs/rag-samples.txt')
for (const text of instructions) {
  const vector = await vpipe.createVector(text)
  vectordb.vectors.push({
    "vector": vector,
    "text": text
  })
}

var vectorjson = JSON.stringify(vectordb)
fs.writeFile("./db/vector_index.json", vectorjson, function(err){
    if(err) throw err;
})